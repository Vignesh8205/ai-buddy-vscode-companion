import * as vscode from 'vscode';
import { CharacterViewProvider } from './providers/characterViewProvider';
import { GeminiService } from './services/geminiService';
import { SecretStorageService } from './services/secretStorage';
import { ContextEngine } from './services/contextEngine';
import { WorkspaceMonitorService } from './services/workspaceMonitor';
import { PersonalityEngine } from './services/personalityEngine';
import { ProactiveDecisionEngine } from './services/proactiveEngine';

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Buddy activating with Proactive Personality & Humour Engine...');

  const secretStorage = new SecretStorageService(context.secrets);
  const contextEngine = new ContextEngine();
  const personalityEngine = new PersonalityEngine();
  const geminiService = new GeminiService(secretStorage, contextEngine);

  // Declare characterProvider reference
  let characterProvider: CharacterViewProvider;

  // Initialize Proactive Decision Engine
  const proactiveEngine = new ProactiveDecisionEngine(
    personalityEngine,
    contextEngine,
    geminiService,
    {
      onProactiveSpeech: (text, emotion, voiceGender, category) => {
        console.log(`[AI Buddy Proactive] (${category}): ${text}`);
        if (characterProvider) {
          characterProvider.sendProactiveSpeech(text, emotion, voiceGender, category);
        }
      },
    }
  );

  characterProvider = new CharacterViewProvider(
    context.extensionUri,
    secretStorage,
    geminiService,
    contextEngine,
    personalityEngine,
    proactiveEngine
  );

  // Initialize Workspace Monitor with debounced callbacks
  const workspaceMonitor = new WorkspaceMonitorService(contextEngine, proactiveEngine, {
    onContextChanged: summary => {
      characterProvider.sendContextUpdate(summary);
    },
    onErrorAlert: (alertText, topError) => {
      console.log(`[AI Buddy Error Alert] ${topError}`);
      characterProvider.sendWorkspaceAlert(alertText, 'confused');
    },
    onTestTaskFinished: (success, taskName) => {
      if (success) {
        characterProvider.sendWorkspaceAlert(
          `Mass! 🔥 "${taskName}" successfully pass aagiduchu! Semma work!`,
          'happy'
        );
      } else {
        characterProvider.sendWorkspaceAlert(
          `Aiyooo! 😂 "${taskName}" fail aagiduchu pola! Test logs check pannalama?`,
          'confused'
        );
      }
    },
  });

  proactiveEngine.activate();
  workspaceMonitor.activate();

  context.subscriptions.push({
    dispose: () => {
      proactiveEngine.dispose();
      workspaceMonitor.dispose();
    },
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CharacterViewProvider.viewType, characterProvider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    })
  );

  // Command: Set API Key via QuickPick
  context.subscriptions.push(
    vscode.commands.registerCommand('aiBuddy.setApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        title: 'AI Buddy: Enter Google Gemini API Key',
        prompt: 'Get your free key from https://aistudio.google.com/app/apikey',
        password: true,
        placeHolder: 'AIzaSy...',
      });

      if (apiKey !== undefined) {
        await secretStorage.setApiKey(apiKey);
        vscode.window.showInformationMessage('AI Buddy: Gemini API Key saved successfully in SecretStorage!');
        characterProvider.postMessage({ type: 'apiKeyStatus', hasKey: !!apiKey });
      }
    })
  );

  // Command: Tell a Programmer Joke
  context.subscriptions.push(
    vscode.commands.registerCommand('aiBuddy.tellJoke', () => {
      const joke = personalityEngine.getRandomJoke();
      const config = vscode.workspace.getConfiguration('aiBuddy');
      const gender = config.get<'female' | 'male'>('voiceGender', 'female');
      characterProvider.postMessage({
        type: 'characterReply',
        text: joke.text,
        emotion: joke.emotion,
        voiceGender: gender,
      });
    })
  );

  // Command: Analyze Workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('aiBuddy.analyzeWorkspace', async () => {
      const summary = await contextEngine.analyzeWorkspace();
      const config = vscode.workspace.getConfiguration('aiBuddy');
      const gender = config.get<'female' | 'male'>('voiceGender', 'female');
      const model = config.get<string>('geminiModel', 'gemini-1.5-flash');

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'AI Buddy is analyzing your workspace...',
        },
        async () => {
          const reply = await geminiService.analyzeCurrentProject(summary, gender, model);
          characterProvider.postMessage({
            type: 'characterReply',
            text: reply.text,
            emotion: reply.emotion,
            voiceGender: gender,
          });
        }
      );
    })
  );

  // Command: Explain Active File Error
  context.subscriptions.push(
    vscode.commands.registerCommand('aiBuddy.explainError', async () => {
      const summary = await contextEngine.analyzeWorkspace();
      const config = vscode.workspace.getConfiguration('aiBuddy');
      const gender = config.get<'female' | 'male'>('voiceGender', 'female');
      const model = config.get<string>('geminiModel', 'gemini-1.5-flash');

      const reply = await geminiService.explainCurrentError(summary, gender, model);
      characterProvider.postMessage({
        type: 'characterReply',
        text: reply.text,
        emotion: reply.emotion,
        voiceGender: gender,
      });
    })
  );

  // Command: Toggle Voice Gender
  context.subscriptions.push(
    vscode.commands.registerCommand('aiBuddy.toggleVoice', async () => {
      const config = vscode.workspace.getConfiguration('aiBuddy');
      const current = config.get<'female' | 'male'>('voiceGender', 'female');
      const next = current === 'female' ? 'male' : 'female';
      await config.update('voiceGender', next, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `AI Buddy: Voice switched to ${next === 'female' ? 'Female (Maya)' : 'Male (Vikram)'}`
      );
      characterProvider.postMessage({ type: 'voiceChanged', gender: next });
    })
  );

  // Command: Reset Conversation
  context.subscriptions.push(
    vscode.commands.registerCommand('aiBuddy.resetSession', () => {
      geminiService.clearHistory();
      vscode.window.showInformationMessage('AI Buddy: Conversation history reset.');
    })
  );

  console.log('AI Buddy extension fully activated with Proactive Conversations!');
}

export function deactivate() {
  console.log('AI Buddy extension deactivated.');
}
