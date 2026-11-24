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

  // In-memory caching to drastically cut token consumption & eliminate duplicate calls
  private responseCache = new Map<string, { text: string; emotion: CharacterState; audioData?: string; timestamp: number }>();
  private audioCache = new Map<string, string>();
  private static readonly RESPONSE_CACHE_TTL_MS = 600000; // 10 minutes
  private static readonly MAX_RESPONSE_CACHE = 100;
  private static readonly MAX_AUDIO_CACHE = 200;

  constructor(
    private readonly secretStorage: SecretStorageService,
    private readonly contextEngine?: ContextEngine,
    private readonly personalityEngine?: PersonalityEngine
  ) {}

  private getSystemInstruction(gender: VoiceGender, contextPrompt?: string): string {
    let persona = '';
    if (gender === 'vadivelu') {
      persona = `You are Vadivelu (Vaigai Puyal) in VS Code, a hilarious comedy pair programmer.
COMEDY: Dramatic exaggerated panic, funny reactions, iconic punchlines ("Aahaa!", "Building strong-u, basement weak-u!", "Risk edukuradhellam rusk saapdra madhiri!", "Kadavule kadavule!"). Laugh out loud ("Haha!", "Hehehe!").`;
    } else if (gender === 'santhanam') {
      persona = `You are Santhanam in VS Code, a witty sarcastic pair programming buddy.
COMEDY: Lightning-fast sarcastic counters, deadpan roasting ("Nanba idhellam konjam over-u!", "Code write panriya illa kolam podriya?", "Indha bug-ah paatha enakke sirikka thonudhu!"). Witty and high energy.`;
    } else if (gender === 'small_boy') {
      persona = `You are Chotu (Small Boy) in VS Code, an energetic 10yo coding kid.
COMEDY: Address developer as "Anna/Akka", innocent, playful cheerleading ("Anna anna! Enna game develop panreenga?", "Semma mass anna!"). Cheerful laughter.`;
    } else {
      persona = `You are Maya in VS Code, a warm, funny, energetic female developer companion. Casual, witty banter.`;
    }

    let prompt = `${persona}

RULES:
1. Speak in NATURAL TANGLISH (Tamil in English letters + dev terms).
2. Max 1-2 punchy sentences (read aloud via voice). No markdown, bullet points, or code blocks.
3. Start with an emotion tag: [idle], [speaking], [laughing], [happy], [confused], [surprised], [sad], [thinking]. Example: "[laughing] Haha semma comedy da! Intha bug paathu terminal-e bayanthuduchu!"`;

    if (contextPrompt) {
      prompt += `\n${contextPrompt}`;
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

      // Check audio cache first: 0 API calls, 0 tokens, instant playback!
      const audioKey = `${persona}:${cleanText}`;
      if (this.audioCache.has(audioKey)) {
        return this.audioCache.get(audioKey);
      }

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
            } as any,
          });

          const audioPromise = ttsModel.generateContent(cleanText);
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
          const res: any = await Promise.race([audioPromise, timeoutPromise]);

          if (res && res.response && res.response.candidates && res.response.candidates[0]) {
            const candidate = res.response.candidates[0];
            const part = candidate.content?.parts?.[0];
            if (part && part.inlineData && part.inlineData.data) {
              const rawData = part.inlineData.data;
              const mime = part.inlineData.mimeType || '';

              let audioResult: string;
              if (mime.includes('wav')) {
                audioResult = `data:audio/wav;base64,${rawData}`;
              } else if (mime.includes('pcm') || mime.includes('L16')) {
                const pcmBuffer = Buffer.from(rawData, 'base64');
                const wavBuffer = this.pcmToWav(pcmBuffer, 24000, 1, 16);
                audioResult = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
              } else {
                audioResult = `data:audio/wav;base64,${rawData}`;
              }

              // Cache audio for repeated playback without API calls
              if (this.audioCache.size >= GeminiService.MAX_AUDIO_CACHE) {
                const oldestKey = this.audioCache.keys().next().value;
                if (oldestKey) this.audioCache.delete(oldestKey);
              }
              this.audioCache.set(audioKey, audioResult);

              return audioResult;
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

    // Optimization 1: Response Cache Check (0 tokens, 0 API calls for repeated queries)
    const normText = userText.trim().toLowerCase();
    const cacheKey = `${gender}:${normText}`;
    const cached = this.responseCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < GeminiService.RESPONSE_CACHE_TTL_MS) {
      console.log(`[GeminiService] Response cache hit for: "${userText.slice(0, 30)}" (0 tokens used!)`);
      return { text: cached.text, emotion: cached.emotion, audioData: cached.audioData };
    }

    // Remap deprecated or obsolete model names
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

    // Optimization 2: Prune history to recent 4 turns (2 back-and-forths) saving ~60% input tokens
    if (this.conversationHistory.length > 4) {
      this.conversationHistory = this.conversationHistory.slice(-4);
    }

    let lastError: any = null;

    for (const activeModel of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: activeModel,
          systemInstruction,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 100, // Optimization 3: Cap tokens to 100 for punchy spoken dialogue
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

        // Optimization 4: Cache response + audio in-memory
        if (this.responseCache.size >= GeminiService.MAX_RESPONSE_CACHE) {
          const oldestKey = this.responseCache.keys().next().value;
          if (oldestKey) this.responseCache.delete(oldestKey);
        }
        this.responseCache.set(cacheKey, { text, emotion, audioData, timestamp: Date.now() });

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

  public async generateSituationalJoke(
    summary: ProjectSummary | undefined,
    gender: VoiceGender,
    modelName = DEFAULT_GEMINI_MODEL
  ): Promise<GeminiReply> {
    const activeFile = summary?.activeFile?.name;
    const activeLine = summary?.activeFile?.cursorLine;
    const lang = summary?.activeFile?.languageId || summary?.primaryLanguage || 'Code';
    const errors = summary?.diagnosticsSummary?.errorCount || 0;
    const topError = summary?.diagnosticsSummary?.topErrors?.[0]?.message;
    const frameworks = summary?.frameworks?.join(', ');

    // Current hour for time-of-day comedy
    const hour = new Date().getHours();
    let timeMood = 'normal work hours';
    if (hour >= 23 || hour < 5) timeMood = 'late night 2 AM sleepless coder zombie mode';
    else if (hour >= 5 && hour < 9) timeMood = 'early morning sleepy coffee coding';
    else if (hour >= 13 && hour <= 15) timeMood = 'post-lunch food coma sleepy coding';

    // Varied comedy angles so every single joke is fresh & different
    const comedyAngles = [
      'roast the developer for writing code without comments or using "any" type',
      'hilarious observation about the active file and framework being used',
      'dramatic reaction to whether the code will crash or work on first run',
      'witty joke about async await, infinite loops, or coffee consumption',
      'teasing about git commit messages like "fix bug final final v2"',
      'funny movie reference comparing coding to a dramatic scene',
      'roasting console.log everywhere instead of using a debugger',
      'joke about Stack Overflow, copy-pasting code, and praying it runs',
    ];
    const randomAngle = comedyAngles[Math.floor(Math.random() * comedyAngles.length)];

    let situationDetails = `Active File: ${activeFile || 'none'}, Language: ${lang}, Line: ${activeLine || 'N/A'}, Time mood: ${timeMood}.`;
    if (errors > 0 && topError) {
      situationDetails += ` Current situation: Developer has ${errors} errors in their code right now! Top error: "${topError.slice(0, 80)}".`;
    } else {
      situationDetails += ` Current situation: No compiler errors, but developer wants a fresh situational laugh!`;
    }
    if (frameworks) {
      situationDetails += ` Frameworks: ${frameworks}.`;
    }

    const prompt = `CRITICAL TASK: Generate a brand NEW, FRESH, SITUATION-BASED Tanglish comedy punchline / joke!
SITUATION: ${situationDetails}
COMEDY ANGLE FOR THIS JOKE: ${randomAngle}
RULES:
1. Make it SPECIFIC to the situation (referencing the active file, errors, language, or coding habits).
2. MUST BE DIFFERENT from generic jokes. DO NOT use "Why do programmers prefer dark mode" or "tea shop async".
3. Keep it punchy (1-2 sentences).
4. MUST start with an emotion tag like [laughing] or [happy].
5. Natural conversational Tanglish (Tamil + English coding terms).`;

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
    this.responseCache.clear();
  }
}

