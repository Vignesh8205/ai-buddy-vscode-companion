import { GoogleGenerativeAI } from '@google/generative-ai';
import { CharacterState, ProjectSummary, VoiceGender } from '../../shared/types';
import { SecretStorageService } from './secretStorage';
import { ContextEngine } from './contextEngine';
import { PersonalityEngine } from './personalityEngine';

export interface GeminiReply {
  text: string;
  emotion: CharacterState;
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
    const persona =
      gender === 'female'
        ? 'You are Maya, a super cute, energetic, funny, and warm female AI developer companion.'
        : 'You are Vikram, a friendly, witty, energetic, and playful male AI developer companion.';

    let prompt = `${persona} You sit beside the developer inside VS Code like their closest pair-programming friend.

CONVERSATION & PERSONALITY RULES:
1. Speak in NATURAL TANGLISH (Tamil written in English characters) naturally mixed with English developer terms (e.g. bugs, terminal, build, async, test, function, component).
2. Tone: Highly casual, empathetic, witty, fun, and human-like.
3. Natural Tamil/Tanglish expressions to use freely: "Heyyy!", "Enna panra?", "Semma!", "Vera level!", "Aiyooo 😂", "Kavalaiye padatha!", "Super da/pa!", "Therikka vidalam!", "Mass!", "Pannidalam!".
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

        return { text, emotion };
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

