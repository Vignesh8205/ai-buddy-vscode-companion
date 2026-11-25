import * as vscode from 'vscode';
import { VoiceGender } from '../../shared/types';
import { SecretStorageService } from './secretStorage';

export class ElevenLabsService {
  private static readonly MAX_CACHE_ITEMS = 200;
  private audioCache = new Map<string, string>();
  private accountVoicesCache: Array<{ voice_id: string; name: string }> | null = null;
  private lastVoicesFetch = 0;

  // Default high-expression character voice mapping from ElevenLabs library
  private static readonly DEFAULT_VOICE_MAP: Record<string, string> = {
    vadivelu: 'N2lVS1w4EtoT3dr4eOWO', // Callum - Husky Trickster (dramatic comedic acting)
    santhanam: 'IKne3meq5aSn9XLyUdCD', // Charlie - Deep, confident, hyped counters
    small_boy: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - Energetic youthful voice
    maya: 'cgSgspJ2msm6clMCkdW9', // Jessica - Playful, bright, warm female
    female: 'cgSgspJ2msm6clMCkdW9',
    male: 'IKne3meq5aSn9XLyUdCD',
  };

  constructor(private readonly secretStorage: SecretStorageService) {}

  /**
   * Synthesize any dynamic text using ElevenLabs Enterprise Voice AI.
   * Returns standard MP3 Data URI: data:audio/mp3;base64,...
   */
  public async synthesize(text: string, persona: VoiceGender): Promise<string | undefined> {
    try {
      if (!text || !text.trim()) return undefined;

      const apiKey = await this.secretStorage.getElevenLabsApiKey();
      if (!apiKey) return undefined;

      // Clean text of emojis, markdown, and code blocks for ultra-smooth speech
      let cleanText = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[#*`_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return undefined;

      // Limit length for conversational natural delivery
      if (cleanText.length > 350) {
        const lastPunctuation = cleanText.slice(0, 350).lastIndexOf('.');
        if (lastPunctuation > 100) {
          cleanText = cleanText.slice(0, lastPunctuation + 1);
        } else {
          cleanText = cleanText.slice(0, 350).trim() + '...';
        }
      }

      // Check audio cache: 0 latency, 0 credits used!
      const cacheKey = `${persona}:${cleanText}`;
      if (this.audioCache.has(cacheKey)) {
        return this.audioCache.get(cacheKey);
      }

      const voiceId = await this.resolveVoiceId(persona, apiKey);

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[ElevenLabsService] API error (${response.status}):`, errText);
        return undefined;
      }

      const arrayBuf = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuf).toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      // Cache audio for repeated instant playback
      if (this.audioCache.size >= ElevenLabsService.MAX_CACHE_ITEMS) {
        const oldest = this.audioCache.keys().next().value;
        if (oldest) this.audioCache.delete(oldest);
      }
      this.audioCache.set(cacheKey, dataUri);

      return dataUri;
    } catch (err) {
      console.warn('[ElevenLabsService] Speech synthesis error:', err);
      return undefined;
    }
  }

  private async resolveVoiceId(persona: VoiceGender, apiKey: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('aiBuddy');

    // 1. Check if user configured an explicit voice ID override in VS Code settings
    const settingKey = `elevenLabsVoice_${persona}`;
    const customVoiceId = config.get<string>(settingKey);
    if (customVoiceId && customVoiceId.trim().length > 0) {
      return customVoiceId.trim();
    }

    // 2. Check if user created a custom cloned voice on their account matching the persona name
    try {
      const accountVoices = await this.getAccountVoices(apiKey);
      if (accountVoices) {
        const targetName = persona.toLowerCase().replace(/_/g, '');
        const matched = accountVoices.find(v => {
          const vName = v.name.toLowerCase().replace(/[\s_-]/g, '');
          return vName.includes(targetName);
        });
        if (matched) {
          return matched.voice_id;
        }
      }
    } catch (e) {
      // ignore
    }

    // 3. Fallback to mapped default expressive voice
    return ElevenLabsService.DEFAULT_VOICE_MAP[persona] || ElevenLabsService.DEFAULT_VOICE_MAP.vadivelu;
  }

  private async getAccountVoices(apiKey: string): Promise<Array<{ voice_id: string; name: string }> | null> {
    const now = Date.now();
    // Cache account voices for 5 minutes
    if (this.accountVoicesCache && now - this.lastVoicesFetch < 300000) {
      return this.accountVoicesCache;
    }

    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.voices && Array.isArray(data.voices)) {
          this.accountVoicesCache = data.voices.map((v: any) => ({
            voice_id: v.voice_id,
            name: v.name,
          }));
          this.lastVoicesFetch = now;
          return this.accountVoicesCache;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /**
   * Checks whether the user has configured an explicit custom voice ID
   * or has a custom cloned voice on their account for this persona.
   */
  public async isClonedVoiceAvailable(persona: VoiceGender): Promise<boolean> {
    try {
      const apiKey = await this.secretStorage.getElevenLabsApiKey();
      if (!apiKey) return false;

      const config = vscode.workspace.getConfiguration('aiBuddy');
      const customVoiceId = config.get<string>(`elevenLabsVoice_${persona}`);
      if (customVoiceId && customVoiceId.trim().length > 0) {
        return true;
      }

      const accountVoices = await this.getAccountVoices(apiKey);
      if (accountVoices) {
        const targetName = persona.toLowerCase().replace(/_/g, '');
        return accountVoices.some((v: any) => {
          const vName = v.name.toLowerCase().replace(/[\s_-]/g, '');
          return vName.includes(targetName) && v.category === 'cloned';
        });
      }
    } catch {
      // ignore
    }
    return false;
  }
}
