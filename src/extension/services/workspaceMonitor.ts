import * as vscode from 'vscode';
import { ContextEngine } from './contextEngine';
import { ProjectSummary } from '../../shared/types';
import { ProactiveDecisionEngine } from './proactiveEngine';

export interface WorkspaceMonitorCallbacks {
  onContextChanged: (summary: ProjectSummary) => void;
  onErrorAlert?: (errorText: string, topError: string) => void;
  onTestTaskFinished?: (success: boolean, taskName: string) => void;
}

export class WorkspaceMonitorService {
  private disposables: vscode.Disposable[] = [];
  private debounceEditorTimer: any = null;
  private debounceSaveTimer: any = null;
  private debounceDiagnosticsTimer: any = null;
  private lastErrorSignature = '';
  private previousErrorCount = 0;

  constructor(
    private readonly contextEngine: ContextEngine,
    private readonly proactiveEngine: ProactiveDecisionEngine,
    private readonly callbacks: WorkspaceMonitorCallbacks
  ) {}

  public activate(): void {
    const config = vscode.workspace.getConfiguration('aiBuddy.monitoring');
    const enabled = config.get<boolean>('enabled', true);
    if (!enabled) {
      console.log('AI Buddy Workspace Monitoring is disabled in settings.');
      return;
    }

    // 1. Monitor Active Text Editor Changes (debounced 600ms)
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.proactiveEngine.recordUserActivity();
        this.debounce(() => this.handleEditorChange(), 'editor', 600);
      })
    );

    // 2. Monitor Text Changes (to track active developer coding)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (!this.contextEngine.isSensitiveFile(e.document.uri.fsPath)) {
          this.proactiveEngine.recordUserActivity();
        }
      })
    );

    // 3. Monitor File Saves (debounced 1500ms)
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(doc => {
        if (!this.contextEngine.isSensitiveFile(doc.uri.fsPath)) {
          this.proactiveEngine.recordUserActivity();
          this.debounce(() => this.handleFileSave(doc), 'save', 1500);
        }
      })
    );

    // 4. Monitor Diagnostics (Errors/Warnings) (debounced 2000ms)
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => {
        this.debounce(() => this.handleDiagnosticsChange(), 'diagnostics', 2000);
      })
    );

    // 5. Monitor Task Completions (e.g., test runs, build scripts)
    this.disposables.push(
      vscode.tasks.onDidEndTaskProcess(event => {
        const taskName = event.execution.task.name || 'Task';
        const isSuccess = event.exitCode === 0;
        if (
          taskName.toLowerCase().includes('test') ||
          taskName.toLowerCase().includes('playwright') ||
          taskName.toLowerCase().includes('build')
        ) {
          if (isSuccess) {
            this.proactiveEngine.evaluateEvent('TEST_PASSED');
          } else {
            this.proactiveEngine.evaluateEvent('TEST_FAILED');
          }
          if (this.callbacks.onTestTaskFinished) {
            this.callbacks.onTestTaskFinished(isSuccess, taskName);
          }
        }
      })
    );

    // Initial summary
    this.refreshSummary();
  }

  private debounce(fn: () => void, timerKey: 'editor' | 'save' | 'diagnostics', delayMs: number) {
    if (timerKey === 'editor') {
      if (this.debounceEditorTimer) clearTimeout(this.debounceEditorTimer);
      this.debounceEditorTimer = setTimeout(fn, delayMs);
    } else if (timerKey === 'save') {
      if (this.debounceSaveTimer) clearTimeout(this.debounceSaveTimer);
      this.debounceSaveTimer = setTimeout(fn, delayMs);
    } else if (timerKey === 'diagnostics') {
      if (this.debounceDiagnosticsTimer) clearTimeout(this.debounceDiagnosticsTimer);
      this.debounceDiagnosticsTimer = setTimeout(fn, delayMs);
    }
  }

  private async handleEditorChange() {
    await this.refreshSummary();
  }

  private async handleFileSave(doc: vscode.TextDocument) {
    console.log(`[AI Buddy] File saved: ${doc.fileName}`);
    await this.refreshSummary();
  }

  private async handleDiagnosticsChange() {
    const summary = await this.refreshSummary();
    if (!summary) return;

    const currentErrorCount = summary.diagnosticsSummary.errorCount;

    // Check if errors just got resolved (BUG_FIXED trigger!)
    if (this.previousErrorCount > 0 && currentErrorCount === 0) {
      this.previousErrorCount = 0;
      this.lastErrorSignature = '';
      await this.proactiveEngine.evaluateEvent('BUG_FIXED');
      return;
    }

    // Check if new errors appeared or repeated
    if (currentErrorCount > 0 && summary.diagnosticsSummary.topErrors.length > 0) {
      const top = summary.diagnosticsSummary.topErrors[0];
      const signature = `${top.file}:${top.line}:${top.message}`;

      if (signature === this.lastErrorSignature) {
        // Repeated identical error! Trigger REPEATED_ERROR
        await this.proactiveEngine.evaluateEvent('REPEATED_ERROR');
      } else {
        this.lastErrorSignature = signature;
        if (this.callbacks.onErrorAlert) {
          this.callbacks.onErrorAlert(
            `Hey! Intha file-la (${top.file}:${top.line}) oru error notice panniya? "${top.message.slice(0, 100)}"`,
            top.message
          );
        }
      }
    }

    this.previousErrorCount = currentErrorCount;
  }

  public async refreshSummary(): Promise<ProjectSummary | null> {
    try {
      const summary = await this.contextEngine.analyzeWorkspace();
      this.callbacks.onContextChanged(summary);
      return summary;
    } catch (e) {
      console.error('[AI Buddy] Failed to analyze workspace:', e);
      return null;
    }
  }

  public dispose(): void {
    if (this.debounceEditorTimer) clearTimeout(this.debounceEditorTimer);
    if (this.debounceSaveTimer) clearTimeout(this.debounceSaveTimer);
    if (this.debounceDiagnosticsTimer) clearTimeout(this.debounceDiagnosticsTimer);

    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
