import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { VoiceGender } from '../../shared/types';

export class NeuralVoiceService {
  private static readonly CACHE_LIMIT = 50;
  private audioCache = new Map<string, string>();

  /**
   * Synthesize any dynamic text into studio-quality Neural Tamil audio (Data URI: data:audio/mp3;base64,...)
   */
  public async synthesize(text: string, persona: VoiceGender): Promise<string | undefined> {
    try {
      if (!text || !text.trim()) return undefined;

      // Clean code blocks, URLs, markdown, and emojis for smooth natural speech
      let cleanText = text
        .replace(/```[\s\S]*?```/g, '') // remove code blocks
        .replace(/https?:\/\/\S+/g, '') // remove URLs
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // remove emojis
        .replace(/[#*`_~]/g, '') // remove markdown symbols
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return undefined;

      // Limit to 350 characters for fast speech synthesis and conversational pacing
      if (cleanText.length > 350) {
        const lastPunctuation = cleanText.slice(0, 350).lastIndexOf('.');
        if (lastPunctuation > 100) {
          cleanText = cleanText.slice(0, lastPunctuation + 1);
        } else {
          cleanText = cleanText.slice(0, 350).trim() + '...';
        }
      }

      const cacheKey = `${persona}:${cleanText}`;
      if (this.audioCache.has(cacheKey)) {
        return this.audioCache.get(cacheKey);
      }

      const tts = new MsEdgeTTS();

      // Configure voice and prosody per persona
      let voice = 'ta-IN-ValluvarNeural';
      let options = { pitch: '+0Hz', rate: '+0%' };

      if (persona === 'small_boy') {
        voice = 'ta-IN-PallaviNeural';
        options = { pitch: '+42Hz', rate: '+18%' };
      } else if (persona === 'vadivelu') {
        voice = 'ta-IN-ValluvarNeural';
        options = { pitch: '+20Hz', rate: '+8%' };
      } else if (persona === 'santhanam') {
        voice = 'ta-IN-ValluvarNeural';
        options = { pitch: '-10Hz', rate: '+24%' };
      } else if (persona === 'male') {
        voice = 'ta-IN-ValluvarNeural';
        options = { pitch: '+0Hz', rate: '+0%' };
      } else {
        // Maya / female
        voice = 'ta-IN-PallaviNeural';
        options = { pitch: '+10Hz', rate: '+5%' };
      }

      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        const timeout = setTimeout(() => {
          try { tts.close(); } catch {}
          reject(new Error('Neural TTS timeout'));
        }, 8000);

        try {
          const { audioStream } = tts.toStream(cleanText, options);
          const chunks: Buffer[] = [];
          audioStream.on('data', chunk => chunks.push(chunk));
          audioStream.on('end', () => {
            clearTimeout(timeout);
            try { tts.close(); } catch {}
            resolve(Buffer.concat(chunks));
          });
          audioStream.on('error', err => {
            clearTimeout(timeout);
            try { tts.close(); } catch {}
            reject(err);
          });
        } catch (e) {
          clearTimeout(timeout);
          try { tts.close(); } catch {}
          reject(e);
        }
      });

      const dataUri = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

      // Cache recent dynamic utterances
      if (this.audioCache.size >= NeuralVoiceService.CACHE_LIMIT) {
        const firstKey = this.audioCache.keys().next().value;
        if (firstKey) this.audioCache.delete(firstKey);
      }
      this.audioCache.set(cacheKey, dataUri);

      return dataUri;
    } catch (err) {
      console.warn('[NeuralVoiceService] Dynamic speech synthesis failed:', err);
      return undefined;
    }
  }
}
