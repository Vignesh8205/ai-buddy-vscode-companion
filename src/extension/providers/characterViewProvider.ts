import * as vscode from 'vscode';
import {
  CharacterState,
  HostToWebviewMessage,
  ProactiveFrequency,
  ProjectSummary,
  VoiceGender,
  WebviewToHostMessage,
} from '../../shared/types';
import { GeminiService } from '../services/geminiService';
import { SecretStorageService } from '../services/secretStorage';
import { ContextEngine } from '../services/contextEngine';
import { PersonalityEngine } from '../services/personalityEngine';
import { ProactiveDecisionEngine } from '../services/proactiveEngine';
import { AudioClipsService } from '../services/audioClipsService';
import { NeuralVoiceService } from '../services/neuralVoiceService';

export class CharacterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiBuddy.characterView';
  private _view?: vscode.WebviewView;
  private _currentVoiceGender?: VoiceGender;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _secretStorage: SecretStorageService,
    private readonly _geminiService: GeminiService,
    private readonly _contextEngine: ContextEngine,
    private readonly _personalityEngine: PersonalityEngine,
    private readonly _proactiveEngine: ProactiveDecisionEngine,
    private readonly _audioClipsService?: AudioClipsService,
    private readonly _neuralVoiceService?: NeuralVoiceService
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    const localResourceRoots = [this._extensionUri];
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        localResourceRoots.push(folder.uri);
      }
    }

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots,
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data: WebviewToHostMessage) => {
      await this._handleWebviewMessage(data);
    });
  }

  private _getAudioClipForPersona(persona: VoiceGender): string | undefined {
    if (!this._audioClipsService) return undefined;
    const clipFile = this._audioClipsService.getRandomClipFile(persona);
    if (clipFile && this._view) {
      return this._view.webview.asWebviewUri(vscode.Uri.file(clipFile)).toString();
    }
    return this._audioClipsService.getRandomClipDataUri(persona);
  }

  private async _getAudioForText(
    text: string,
    persona: VoiceGender,
    skipGeminiTTS = false
  ): Promise<string | undefined> {
    // 1. Primary: Gemini Conversational Native Audio (Human-like tone, laughs, natural prosody)
    if (!skipGeminiTTS) {
      try {
        const apiKey = await this._secretStorage.getApiKey();
        if (apiKey && this._geminiService) {
          const geminiAudio = await this._geminiService.generateAudio(text, persona, apiKey);
          if (geminiAudio) return geminiAudio;
        }
      } catch (err) {
        console.warn('[CharacterViewProvider] Gemini native audio error:', err);
      }
    }

    // 2. Secondary Fallback: Refined Free Neural Voice (Zero pitch distortion, 0 API tokens)
    if (this._neuralVoiceService) {
      try {
        const neuralAudio = await this._neuralVoiceService.synthesize(text, persona);
        if (neuralAudio) return neuralAudio;
      } catch (err) {
        console.warn('[CharacterViewProvider] Neural voice synthesis error:', err);
      }
    }

    // 3. Fallback: Pre-recorded audio clip
    return this._getAudioClipForPersona(persona);
  }

  private async _handleWebviewMessage(message: WebviewToHostMessage): Promise<void> {
    if (!this._view) return;

    const config = vscode.workspace.getConfiguration('aiBuddy');
    const voiceGender = this._currentVoiceGender || config.get<VoiceGender>('voiceGender', 'vadivelu');
    const modelName = config.get<string>('geminiModel', 'gemini-3.5-flash');
    const proactiveFrequency = config.get<ProactiveFrequency>('conversationFrequency', 'medium');

    switch (message.type) {
      case 'ready': {
        const quietMode = config.get<boolean>('quietMode', false);
        const hasApiKey = await this._secretStorage.hasApiKey();
        const contextSummary = this._contextEngine.getCurrentSummary() || undefined;

        this.postMessage({
          type: 'init',
          voiceGender,
          hasApiKey,
          quietMode,
          modelName,
          proactiveFrequency,
          contextSummary,
        });
        break;
      }

      case 'sendMessage': {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: 'thinking' });

        const summary = this._contextEngine.getCurrentSummary() || undefined;
        const reply = await this._geminiService.generateReply(
          message.text,
          voiceGender,
          modelName,
          summary
        );

        // Optimization: if reply.audioData was already attempted and missing, skip Gemini TTS to prevent duplicate API requests
        const audioData = reply.audioData || (await this._getAudioForText(reply.text, voiceGender, true));
        this.postMessage({
          type: 'characterReply',
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
          audioData,
        });
        break;
      }

      case 'tellJoke': {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: 'thinking' });

        let summary = this._contextEngine.getCurrentSummary();
        if (!summary) {
          summary = await this._contextEngine.analyzeWorkspace();
        }

        let jokeReply: { text: string; emotion: CharacterState; audioData?: string };
        const hasKey = await this._secretStorage.hasApiKey();
        if (hasKey) {
          jokeReply = await this._geminiService.generateSituationalJoke(summary, voiceGender, modelName);
        } else {
          const fallback = this._personalityEngine.getSituationalJoke(voiceGender, summary);
          jokeReply = { text: fallback.text, emotion: fallback.emotion };
        }

        // Optimization: avoid duplicate Gemini TTS call if already attempted
        const audioData = jokeReply.audioData || (await this._getAudioForText(jokeReply.text, voiceGender, true));
        this.postMessage({
          type: 'characterReply',
          text: jokeReply.text,
          emotion: jokeReply.emotion,
          voiceGender,
          audioData,
        });
        break;
      }

      case 'setFrequency': {
        await config.update('conversationFrequency', message.frequency, vscode.ConfigurationTarget.Global);
        this.postMessage({ type: 'frequencyChanged', frequency: message.frequency });
        vscode.window.showInformationMessage(`AI Buddy: Proactive conversation frequency set to ${message.frequency}`);
        break;
      }

      case 'explainError': {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: 'thinking' });

        let summary = this._contextEngine.getCurrentSummary();
        if (!summary) {
          summary = await this._contextEngine.analyzeWorkspace();
        }

        const reply = await this._geminiService.explainCurrentError(summary, voiceGender, modelName);
        const audioData = reply.audioData || (await this._getAudioForText(reply.text, voiceGender, true));

        this.postMessage({
          type: 'characterReply',
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
          audioData,
        });
        break;
      }

      case 'analyzeWorkspace': {
        this._proactiveEngine.recordUserActivity();
        this.postMessage({ type: 'thinking' });

        let summary = this._contextEngine.getCurrentSummary();
        if (!summary) {
          summary = await this._contextEngine.analyzeWorkspace();
        }

        const reply = await this._geminiService.analyzeCurrentProject(summary, voiceGender, modelName);
        const audioData = reply.audioData || (await this._getAudioForText(reply.text, voiceGender, true));

        this.postMessage({
          type: 'characterReply',
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
          audioData,
        });
        break;
      }

      case 'setVoice': {
        this._currentVoiceGender = message.gender;
        await config.update('voiceGender', message.gender, vscode.ConfigurationTarget.Global);
        this.postMessage({ type: 'voiceChanged', gender: message.gender });
        break;
      }

      case 'setApiKey': {
        await this._secretStorage.setApiKey(message.key);
        const hasKey = await this._secretStorage.hasApiKey();
        this.postMessage({ type: 'apiKeyStatus', hasKey });
        vscode.window.showInformationMessage('AI Buddy: Gemini API key stored securely in SecretStorage!');
        break;
      }

      case 'checkApiKey': {
        const hasKey = await this._secretStorage.hasApiKey();
        this.postMessage({ type: 'apiKeyStatus', hasKey });
        break;
      }

      case 'clearHistory': {
        this._geminiService.clearHistory();
        vscode.window.showInformationMessage('AI Buddy: Conversation history cleared.');
        break;
      }
    }
  }

  public postMessage(message: HostToWebviewMessage): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  public sendContextUpdate(summary: ProjectSummary): void {
    this.postMessage({
      type: 'contextUpdated',
      summary,
    });
  }

  public async sendProactiveSpeech(
    text: string,
    emotion: CharacterState,
    voiceGender: VoiceGender,
    category: string
  ): Promise<void> {
    // Proactive speech uses free Edge-TTS directly, preserving Gemini TTS API quota
    const audioData = await this._getAudioForText(text, voiceGender, true);
    this.postMessage({
      type: 'proactiveSpeech',
      text,
      emotion,
      voiceGender,
      category,
      audioData,
    });
  }

  public async sendWorkspaceAlert(text: string, emotion: CharacterState): Promise<void> {
    const config = vscode.workspace.getConfiguration('aiBuddy');
    const voiceGender = this._currentVoiceGender || config.get<VoiceGender>('voiceGender', 'vadivelu');
    // Workspace alerts use free Edge-TTS directly
    const audioData = await this._getAudioForText(text, voiceGender, true);

    this.postMessage({
      type: 'workspaceAlert',
      text,
      emotion,
      voiceGender,
      audioData,
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.css')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https: data:; media-src ${webview.cspSource} https: blob: data:; connect-src ${webview.cspSource} https: data: blob:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>AI Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: var(--vscode-sideBar-background, #12101F); overflow: hidden;">
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
