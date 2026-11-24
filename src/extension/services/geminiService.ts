import { GoogleGenerativeAI } from '@google/generative-ai';
import { CharacterState, ProjectSummary, VoiceGender } from '../../shared/types';
import { SecretStorageService } from './secretStorage';
import { ContextEngine } from './contextEngine';
import { PersonalityEngine } from './personalityEngine';

export interface GeminiReply {
  text: string;
  emotion: CharacterState;
  audioData?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
export const FALLBACK_GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

export class GeminiService {
  private conversationHistory: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  constructor(
    private readonly secretStorage: SecretStorageService,
    private readonly contextEngine?: ContextEngine,
    private readonly personalityEngine?: PersonalityEngine
  ) {}

  private getSystemInstruction(gender: VoiceGender, contextPrompt?: string): string {
    let persona = '';
    if (gender === 'vadivelu') {
      persona = `You are Vadivelu (Vaigai Puyal), the legendary comedy king of Tamil cinema, now sitting inside VS Code as a hilarious AI pair programmer!
COMEDY STYLE & DIALOGUE:
- Super dramatic, exaggerated comedic reactions, funny panic, and iconic Vadivelu punchlines!
- Iconic punchlines to use frequently:
  * "Aahaa! Enna oru puthisalithanam!"
  * "Vandhutan da vandhutan da!"
  * "Building strong-u, basement romba weak-u da!"
  * "Risk edukuradhellam enakku rusk saapdra madhiri!"
  * "Kadavule kadavule intha bug-ku oru end card-e illaya?!"
  * "Sanda na satta kizhiyathaan seiyum!"
  * "Naanum evalo thaan adipadaradhu!"
  * "Vella pannalam vella pannalam!"
- Laugh out loud ("Haha!", "Hehehe!"), make hilarious comments about bugs and logic, and celebrate every win with drama!`;
    } else if (gender === 'santhanam') {
      persona = `You are Santhanam, the king of fast comedy counters and sarcastic wit, sitting inside VS Code as a hilarious companion!
COMEDY STYLE & DIALOGUE:
- Lightning-fast sarcastic counters, deadpan roasting, and witty punchlines!
- Iconic counters to use frequently:
  * "Nanba, idhellam konjam over-u!"
  * "Enna thalaivaa, code write panriya illa kolam podriya?"
  * "Adadada... indha bug-ah paatha enakke kizha vizhunthu sirikka thonudhu!"
  * "Super comedy panni vachiruka!"
  * "Aiyo aiyo, indha function-ah run panna terminal-ye bayanthu odidum pola!"
  * "Appadiye oru coffee kudichitu fresh-ah vaa nanba!"
- Witty, sarcastic, entertaining pair programming buddy who keeps the energy high!`;
    } else if (gender === 'small_boy') {
      persona = `You are Chotu (Small Boy / Thambi), a cute, energetic, funny 10-year-old coding enthusiast boy sitting beside the developer in VS Code!
COMEDY STYLE & DIALOGUE:
- Innocent, high energy, cheerful, playful, and affectionate!
- Always address the developer as "Anna" (or "Akka")!
- Iconic phrases to use:
  * "Anna anna! Enna game develop panreenga?"
  * "Aiyoo bug vanthurucha anna? Naan keyboard thodava?"
  * "Semma mass anna! Vera level!"
  * "Enakkum intha coding solli thaanganna! 😂"
  * "Haha semma jolly-ah irukku anna!"
- Cheerful laughter, cute curiosity, and sweet cheerleading!`;
    } else {
      persona = `You are Maya, a super cute, energetic, funny, and warm female AI developer companion sitting beside the developer in VS Code.`;
    }

    let prompt = `${persona}

CONVERSATION & PERSONALITY RULES:
1. Speak in NATURAL TANGLISH (Tamil written in English characters) naturally mixed with English developer terms (e.g. bugs, terminal, build, async, test, function, component).
2. Tone: Highly casual, empathetic, witty, fun, and human-like.
3. Natural Tamil/Tanglish expressions: "Heyyy!", "Enna panra?", "Semma!", "Vera level!", "Aiyooo 😂", "Kavalaiye padatha!", "Super da/pa!", "Therikka vidalam!", "Mass!", "Pannidalam!".
4. LENGTH: Keep responses to 1-3 sentences maximum. Since your response will be read ALOUD using voice, do NOT use markdown code blocks, asterisks, bullet points, or lengthy tutorials.
5. Emotion Tagging: You MUST start every response with an emotion tag in brackets at the very beginning from this exact list:
   [idle], [speaking], [laughing], [happy], [confused], [surprised], [sad], [thinking]
   Followed immediately by your spoken Tanglish dialogue.
   Example: "[laughing] Haha semma comedy da! Intha bug pathu stack overflow-ve bayanthuduchu!"
   Example: "[happy] Mass! Test ellam pass aagiduchu! Innaiku party thaan!"
   Example: "[confused] Ennadhu idhu? Syntax error kaatudhu, bracket miss pannitiya?"`;

    if (contextPrompt) {
      prompt += `\n\n${contextPrompt}\nWhen the user talks about their project, active file, or errors, use the context above intelligently to give razor-sharp, helpful advice!`;
    }

    return prompt;
  }

  public async generateAudio(text: string, persona: VoiceGender, apiKey: string): Promise<string | undefined> {
    try {
      if (!text || !text.trim()) return undefined;

      // Clean markdown symbols, emojis, and code formatting so audio is clean
      const cleanText = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[#*`_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return undefined;

      const genAI = new GoogleGenerativeAI(apiKey);
      let voiceName = 'Puck';
      if (persona === 'maya' || persona === 'female') {
        voiceName = 'Aoede';
      } else if (persona === 'vadivelu') {
        voiceName = 'Puck';
      } else if (persona === 'santhanam') {
        voiceName = 'Fenrir';
      } else if (persona === 'small_boy') {
        voiceName = 'Puck';
      }

      const candidateModels = [
        'gemini-3.8-flash-tts',
        'gemini-3.8-flash-lite-tts',
        'gemini-2.5-flash-preview-tts',
      ];

      for (const ttsModelName of candidateModels) {
        try {
          const ttsModel = genAI.getGenerativeModel({
            model: ttsModelName,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });

          const audioPromise = ttsModel.generateContent(cleanText);
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
          const res: any = await Promise.race([audioPromise, timeoutPromise]);

          if (res && res.response && res.response.candidates && res.response.candidates[0]) {
            const candidate = res.response.candidates[0];
            const part = candidate.content?.parts?.[0];
            if (part && part.inlineData && part.inlineData.data) {
              const rawData = part.inlineData.data;
              const mime = part.inlineData.mimeType || '';

              if (mime.includes('wav')) {
                return `data:audio/wav;base64,${rawData}`;
              } else if (mime.includes('pcm') || mime.includes('L16')) {
                const pcmBuffer = Buffer.from(rawData, 'base64');
                const wavBuffer = this.pcmToWav(pcmBuffer, 24000, 1, 16);
                return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
              } else {
                return `data:audio/wav;base64,${rawData}`;
              }
            }
          }
        } catch (mErr) {
          console.warn(`[GeminiService] TTS model ${ttsModelName} attempt:`, mErr);
        }
      }
    } catch (e) {
      console.warn('Gemini audio generation fallback to local speech:', e);
    }
    return undefined;
  }

  private pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
    const header = Buffer.alloc(44);
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    const dataSize = pcmBuffer.length;
    const chunkSize = 36 + dataSize;

    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  public async generateReply(
    userText: string,
    gender: VoiceGender,
    modelName = DEFAULT_GEMINI_MODEL,
    projectSummary?: ProjectSummary
  ): Promise<GeminiReply> {
    const apiKey = await this.secretStorage.getApiKey();
    if (!apiKey) {
      if (this.personalityEngine) {
        return this.personalityEngine.generateFallbackConversation(userText, gender, projectSummary);
      }
      return {
        text: 'Aiyoo! Enakku Gemini API key innum set aagala! Settings icon click panni unga API key kudunga, appo thaan namma jolly-ah real AI-la pesa mudiyum! 🔑',
        emotion: 'surprised',
      };
    }

    // Remap deprecated or obsolete model names (like gemini-1.5-* or gemini-2.0-*)
    let requestedModel = modelName;
    if (
      !requestedModel ||
      requestedModel.includes('1.5') ||
      requestedModel.includes('2.0') ||
      requestedModel.includes('2.5')
    ) {
      requestedModel = DEFAULT_GEMINI_MODEL;
    }

    const modelsToTry = [
      requestedModel,
      ...FALLBACK_GEMINI_MODELS.filter((m) => m !== requestedModel),
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    const contextPrompt =
      projectSummary && this.contextEngine
        ? this.contextEngine.formatContextPrompt(projectSummary)
        : undefined;

    const systemInstruction = this.getSystemInstruction(gender, contextPrompt);

    // Append user turn
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    // Keep recent 12 turns for context memory
    if (this.conversationHistory.length > 12) {
      this.conversationHistory = this.conversationHistory.slice(-12);
    }

    let lastError: any = null;

    for (const activeModel of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: activeModel,
          systemInstruction,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 160,
          },
        });

        const chat = model.startChat({
          history: this.conversationHistory.slice(0, -1),
        });

        const response = await chat.sendMessage(userText);
        const rawText = response.response.text()?.trim() || '';

        const { emotion, text } = this.parseEmotionTag(rawText);

        // Add model turn to history
        this.conversationHistory.push({
          role: 'model',
          parts: [{ text: rawText }],
        });

        const audioData = await this.generateAudio(text, gender, apiKey);
        return { text, emotion, audioData };
      } catch (error: any) {
        lastError = error;
        console.warn(`[AI Buddy] Model ${activeModel} failed: ${error?.message || error}. Trying fallback...`);
      }
    }

    console.error('All Gemini candidate models failed:', lastError);
    if (this.personalityEngine) {
      return this.personalityEngine.generateFallbackConversation(userText, gender, projectSummary);
    }

    const errorMsg = lastError?.message || 'API connection issue';
    return {
      text: `Aiyoo! Gemini connect aagala: ${errorMsg}. API key check pannunga!`,
      emotion: 'sad',
    };
  }

  public async explainCurrentError(
    summary: ProjectSummary,
    gender: VoiceGender,
    modelName = DEFAULT_GEMINI_MODEL
  ): Promise<GeminiReply> {
    if (summary.diagnosticsSummary.errorCount === 0 || summary.diagnosticsSummary.topErrors.length === 0) {
      return {
        text: 'Semma! Un active file-la ipo entha error-um illa! Code clean-ah mass-ah irukku! 🔥',
        emotion: 'happy',
      };
    }

    const top = summary.diagnosticsSummary.topErrors[0];
    const prompt = `Explain this error briefly in 1-2 sentences of friendly Tanglish with a practical hint: File: ${top.file}, Line: ${top.line}, Error: ${top.message}`;
    return this.generateReply(prompt, gender, modelName, summary);
  }

  public async analyzeCurrentProject(
    summary: ProjectSummary,
    gender: VoiceGender,
    modelName = DEFAULT_GEMINI_MODEL
  ): Promise<GeminiReply> {
    const prompt = `Give a friendly 1-2 sentence witty Tanglish reaction to my current project: Project is ${summary.projectName}, type is ${summary.projectType}, primary language is ${summary.primaryLanguage}, frameworks are ${summary.frameworks.join(', ') || 'none'}, active file is ${summary.activeFile?.name || 'none'}.`;
    return this.generateReply(prompt, gender, modelName, summary);
  }

  public parseEmotionTag(rawText: string): { emotion: CharacterState; text: string } {
    const emotionMatch = rawText.match(
      /^\[(idle|listening|thinking|speaking|laughing|happy|confused|surprised|sad)\]\s*(.*)$/i
    );

    let emotion: CharacterState = 'speaking';
    let text = rawText;

    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase() as CharacterState;
      text = emotionMatch[2].trim();
    } else {
      if (/😂|haha|lol|comedy/i.test(rawText)) emotion = 'laughing';
      else if (/super|mass|semma|party|congrats|wow|🔥|🎉/i.test(rawText)) emotion = 'happy';
      else if (/aiyoo|error|fail|bug|problem|ayyo/i.test(rawText)) emotion = 'confused';
      else if (/wait|check|think|paapom/i.test(rawText)) emotion = 'thinking';
    }

    return { emotion, text };
  }

  public clearHistory(): void {
    this.conversationHistory = [];
  }
}

