import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { VoiceGender } from '../../shared/types';
import { TamilTransliterator } from './tamilTransliterator';

export class NeuralVoiceService {
  private static readonly CACHE_LIMIT = 200;
  private audioCache = new Map<string, string>();

  /**
   * Synthesize dynamic text into natural, non-distorted speech with authentic Tamil phonetics.
   * Data URI: data:audio/mp3;base64,...
   */
  public async synthesize(
    text: string,
    persona: VoiceGender,
    spokenTamil?: string
  ): Promise<string | undefined> {
    try {
      if (!text || !text.trim()) return undefined;

      // Clean code blocks, URLs, markdown, and emojis for smooth natural speech
      let cleanText = (spokenTamil || text)
        .replace(/```[\s\S]*?```/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[#*`_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return undefined;

      // Automatically transliterate Tanglish to natural Tamil script if not already Tamil
      cleanText = TamilTransliterator.toTamil(cleanText);

      // Limit length for conversational pacing
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

      // Try synthesis with auto-retry on network disconnect
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const tts = new MsEdgeTTS();

          // Detect if text has Tamil Unicode script
          const hasTamilScript = /[\u0B80-\u0BFF]/.test(cleanText);

          let voice = 'ta-IN-ValluvarNeural';
          let options = { pitch: '+0Hz', rate: '+4%' };

          if (hasTamilScript) {
            if (persona === 'maya' || persona === 'female') {
              voice = 'ta-IN-PallaviNeural';
              options = { pitch: '+0Hz', rate: '+2%' };
            } else if (persona === 'small_boy') {
              voice = 'ta-IN-PallaviNeural';
              options = { pitch: '+2Hz', rate: '+6%' };
            } else if (persona === 'santhanam') {
              voice = 'ta-IN-ValluvarNeural';
              options = { pitch: '+0Hz', rate: '+8%' }; // Fast punchy comic delivery
            } else {
              // vadivelu / male
              voice = 'ta-IN-ValluvarNeural';
              options = { pitch: '+0Hz', rate: '+4%' };
            }
          } else {
            // Natural Indian English / Tanglish Expressive Voices
            if (persona === 'small_boy') {
              voice = 'en-IN-NeerjaExpressiveNeural';
              options = { pitch: '+0Hz', rate: '+6%' };
            } else if (persona === 'vadivelu') {
              voice = 'en-IN-PrabhatNeural';
              options = { pitch: '+0Hz', rate: '+6%' };
            } else if (persona === 'santhanam') {
              voice = 'en-IN-PrabhatNeural';
              options = { pitch: '+0Hz', rate: '+10%' };
            } else if (persona === 'male') {
              voice = 'en-IN-PrabhatNeural';
              options = { pitch: '+0Hz', rate: '+0%' };
            } else {
              // Maya / female
              voice = 'en-IN-NeerjaExpressiveNeural';
              options = { pitch: '+0Hz', rate: '+2%' };
            }
          }

          await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

          const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
            const timeout = setTimeout(() => {
              try { tts.close(); } catch { }
              reject(new Error('Neural TTS timeout'));
            }, 4500);

            try {
              const { audioStream } = tts.toStream(cleanText, options);
              const chunks: Buffer[] = [];
              audioStream.on('data', chunk => chunks.push(chunk));
              audioStream.on('end', () => {
                clearTimeout(timeout);
                try { tts.close(); } catch { }
                resolve(Buffer.concat(chunks));
              });
              audioStream.on('error', err => {
                clearTimeout(timeout);
                try { tts.close(); } catch { }
                reject(err);
              });
            } catch (e) {
              clearTimeout(timeout);
              try { tts.close(); } catch { }
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
        } catch (attemptErr) {
          if (attempt === 2) throw attemptErr;
        }
      }
    } catch (err) {
      console.warn('[NeuralVoiceService] Dynamic speech synthesis failed:', err);
      return undefined;
    }
  }
}
