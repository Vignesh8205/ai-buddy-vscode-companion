import * as vscode from 'vscode';

export class SecretStorageService {
  private static readonly KEY_NAME = 'aiBuddy.geminiApiKey';

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
}
