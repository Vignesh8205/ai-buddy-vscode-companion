import * as vscode from 'vscode';

export class SecretStorageService {
  private static readonly KEY_NAME = 'aiBuddy.geminiApiKey';
  private static readonly ELEVENLABS_KEY_NAME = 'aiBuddy.elevenLabsApiKey';

  constructor(private readonly secretStorage: vscode.SecretStorage) {}

  public async getApiKey(): Promise<string | undefined> {
    // Check SecretStorage first
    const secret = await this.secretStorage.get(SecretStorageService.KEY_NAME);
    if (secret && secret.trim().length > 0) {
      return secret.trim();
    }
    // Fallback to process.env if available
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      return process.env.GEMINI_API_KEY.trim();
    }
    // Fallback to apikey.md in workspace root if present
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri;
        const keyUri = vscode.Uri.joinPath(rootPath, 'apikey.md');
        const content = await vscode.workspace.fs.readFile(keyUri);
        const text = new TextDecoder().decode(content).trim();
        const firstLine = text.split(/\r?\n/)[0].trim();
        if (firstLine && firstLine.length > 10 && !firstLine.startsWith('elevenlabs')) {
          return firstLine;
        }
      }
    } catch (e) {
      // not present
    }
    return undefined;
  }

  public async setApiKey(key: string): Promise<void> {
    if (!key || key.trim().length === 0) {
      await this.secretStorage.delete(SecretStorageService.KEY_NAME);
    } else {
      await this.secretStorage.store(SecretStorageService.KEY_NAME, key.trim());
    }
  }

  public async hasApiKey(): Promise<boolean> {
    const key = await this.getApiKey();
    return !!key && key.length > 0;
  }

  public async deleteApiKey(): Promise<void> {
    await this.secretStorage.delete(SecretStorageService.KEY_NAME);
  }

  public async getElevenLabsApiKey(): Promise<string | undefined> {
    // Check SecretStorage first
    const secret = await this.secretStorage.get(SecretStorageService.ELEVENLABS_KEY_NAME);
    if (secret && secret.trim().length > 0) {
      return secret.trim();
    }
    // Fallback to process.env
    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim().length > 0) {
      return process.env.ELEVENLABS_API_KEY.trim();
    }
    // Fallback to apikey.md in workspace root if present
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const rootPath = workspaceFolders[0].uri;
        const keyUri = vscode.Uri.joinPath(rootPath, 'apikey.md');
        const content = await vscode.workspace.fs.readFile(keyUri);
        const text = new TextDecoder().decode(content);
        const match = text.match(/elevenlabs\s*:\s*["']?([a-zA-Z0-9_-]+)/i);
        if (match && match[1].length > 10) {
          return match[1].trim();
        }
      }
    } catch (e) {
      // not present
    }
    return undefined;
  }

  public async setElevenLabsApiKey(key: string): Promise<void> {
    if (!key || key.trim().length === 0) {
      await this.secretStorage.delete(SecretStorageService.ELEVENLABS_KEY_NAME);
    } else {
      await this.secretStorage.store(SecretStorageService.ELEVENLABS_KEY_NAME, key.trim());
    }
  }

  public async hasElevenLabsApiKey(): Promise<boolean> {
    const key = await this.getElevenLabsApiKey();
    return !!key && key.length > 0;
  }
}
