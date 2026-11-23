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

export class CharacterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiBuddy.characterView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _secretStorage: SecretStorageService,
    private readonly _geminiService: GeminiService,
    private readonly _contextEngine: ContextEngine,
    private readonly _personalityEngine: PersonalityEngine,
    private readonly _proactiveEngine: ProactiveDecisionEngine
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data: WebviewToHostMessage) => {
      await this._handleWebviewMessage(data);
    });
  }

  private async _handleWebviewMessage(message: WebviewToHostMessage): Promise<void> {
    if (!this._view) return;

    const config = vscode.workspace.getConfiguration('aiBuddy');
    const voiceGender = config.get<VoiceGender>('voiceGender', 'female');
    const modelName = config.get<string>('geminiModel', 'gemini-1.5-flash');
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

        this.postMessage({
          type: 'characterReply',
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
        });
        break;
      }

      case 'tellJoke': {
        this._proactiveEngine.recordUserActivity();
        const joke = this._personalityEngine.getRandomJoke();
        this.postMessage({
          type: 'characterReply',
          text: joke.text,
          emotion: joke.emotion,
          voiceGender,
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

        this.postMessage({
          type: 'characterReply',
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
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

        this.postMessage({
          type: 'characterReply',
          text: reply.text,
          emotion: reply.emotion,
          voiceGender,
        });
        break;
      }

      case 'setVoice': {
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

  public sendProactiveSpeech(
    text: string,
    emotion: CharacterState,
    voiceGender: VoiceGender,
    category: string
  ): void {
    this.postMessage({
      type: 'proactiveSpeech',
      text,
      emotion,
      voiceGender,
      category,
    });
  }

  public sendWorkspaceAlert(text: string, emotion: CharacterState): void {
    const config = vscode.workspace.getConfiguration('aiBuddy');
    const voiceGender = config.get<VoiceGender>('voiceGender', 'female');

    this.postMessage({
      type: 'workspaceAlert',
      text,
      emotion,
      voiceGender,
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https: data:; media-src ${webview.cspSource} https: blob:; connect-src ${webview.cspSource} https:;">
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
