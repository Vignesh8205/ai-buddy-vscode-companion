import * as vscode from 'vscode';
import * as path from 'path';
import { DiagnosticErrorItem, ProjectSummary } from '../../shared/types';

export class ContextEngine {
  private currentSummary: ProjectSummary | null = null;

  public async analyzeWorkspace(): Promise<ProjectSummary> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const rootPath = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : '';
    const projectName = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].name : 'Unknown Project';

    let projectType = 'Generic';
    const frameworks: string[] = [];
    let testFramework: string | undefined;
    let primaryLanguage = 'Plain Text';

    // 1. Analyze package.json or project manifests
    if (rootPath) {
      try {
        const pkgUri = vscode.Uri.file(path.join(rootPath, 'package.json'));
        const pkgDoc = await vscode.workspace.fs.readFile(pkgUri);
        const pkg = JSON.parse(new TextDecoder().decode(pkgDoc));

        projectType = 'Node.js';
        primaryLanguage = 'JavaScript';

        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };

        if (allDeps['typescript']) primaryLanguage = 'TypeScript';
        if (allDeps['react']) frameworks.push('React');
        if (allDeps['next']) frameworks.push('Next.js');
        if (allDeps['vue']) frameworks.push('Vue');
        if (allDeps['express']) frameworks.push('Express');
        if (allDeps['fastify']) frameworks.push('Fastify');
        if (allDeps['@vscode/vsce'] || allDeps['vscode']) frameworks.push('VS Code Extension');

        // Test Framework Detection
        if (allDeps['@playwright/test'] || allDeps['playwright']) testFramework = 'Playwright';
        else if (allDeps['jest']) testFramework = 'Jest';
        else if (allDeps['vitest']) testFramework = 'Vitest';
        else if (allDeps['cypress']) testFramework = 'Cypress';
        else if (allDeps['mocha']) testFramework = 'Mocha';
      } catch (e) {
        // No package.json or failed to parse
      }

      // Check Python or other stacks if no package.json found
      if (projectType === 'Generic') {
        try {
          const reqUri = vscode.Uri.file(path.join(rootPath, 'requirements.txt'));
          await vscode.workspace.fs.stat(reqUri);
          projectType = 'Python';
          primaryLanguage = 'Python';
          testFramework = 'pytest';
        } catch (e) {
          // not python requirements
        }
      }
    }

    // 2. Analyze Active Editor
    let activeFileInfo: ProjectSummary['activeFile'] | undefined;
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const doc = activeEditor.document;
      const relPath = rootPath ? path.relative(rootPath, doc.uri.fsPath) : doc.uri.fsPath;

      // Ensure active file is not a sensitive secret file
      if (!this.isSensitiveFile(relPath)) {
        activeFileInfo = {
          name: path.basename(doc.uri.fsPath),
          relativePath: relPath.replace(/\\/g, '/'),
          languageId: doc.languageId,
          lineCount: doc.lineCount,
          cursorLine: activeEditor.selection.active.line + 1,
        };
        primaryLanguage = doc.languageId.toUpperCase();
      }
    }

    // 3. Analyze Diagnostics (Errors & Warnings)
    const diagnosticsSummary = this.extractDiagnostics(rootPath);

    // 4. Git Branch Detection (lightweight)
    let gitBranch: string | undefined;
    try {
      const gitExt = vscode.extensions.getExtension('vscode.git');
      if (gitExt && gitExt.isActive) {
        const gitApi = gitExt.exports.getAPI(1);
        if (gitApi.repositories.length > 0) {
          gitBranch = gitApi.repositories[0].state.HEAD?.name;
        }
      }
    } catch (e) {
      // Git extension not ready or not installed
    }

    const summary: ProjectSummary = {
      projectName,
      projectType,
      frameworks,
      testFramework,
      primaryLanguage,
      activeFile: activeFileInfo,
      diagnosticsSummary,
      gitBranch,
      lastUpdated: Date.now(),
    };

    this.currentSummary = summary;
    return summary;
  }

  public getCurrentSummary(): ProjectSummary | null {
    return this.currentSummary;
  }

  private extractDiagnostics(rootPath: string): ProjectSummary['diagnosticsSummary'] {
    let errorCount = 0;
    let warningCount = 0;
    const topErrors: DiagnosticErrorItem[] = [];

    const allDiagnostics = vscode.languages.getDiagnostics();

    for (const [uri, diags] of allDiagnostics) {
      const fsPath = uri.fsPath;

      // Skip non-workspace files, external libs, or sensitive files
      if (rootPath && !fsPath.startsWith(rootPath)) continue;
      if (fsPath.includes('node_modules') || fsPath.includes('.git')) continue;
      if (this.isSensitiveFile(fsPath)) continue;

      for (const diag of diags) {
        if (diag.severity === vscode.DiagnosticSeverity.Error) {
          errorCount++;
          if (topErrors.length < 5) {
            topErrors.push({
              file: path.basename(fsPath),
              line: diag.range.start.line + 1,
              message: diag.message.slice(0, 160),
              source: diag.source,
            });
          }
        } else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
          warningCount++;
        }
      }
    }

    return {
      errorCount,
      warningCount,
      topErrors,
    };
  }

  public isSensitiveFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    const sensitivePatterns = [
      '.env',
      'id_rsa',
      '.pem',
      '.key',
      'credentials',
      'secret',
      'token',
      'passwd',
      'shadow',
      'htpasswd',
    ];
    return sensitivePatterns.some(pattern => lower.includes(pattern));
  }

  public formatContextPrompt(summary: ProjectSummary): string {
    const lines: string[] = [
      `[CURRENT WORKSPACE CONTEXT]`,
      `- Project: ${summary.projectName} (${summary.projectType}, ${summary.primaryLanguage})`,
    ];

    if (summary.frameworks.length > 0) {
      lines.push(`- Frameworks: ${summary.frameworks.join(', ')}`);
    }

    if (summary.testFramework) {
      lines.push(`- Test Framework: ${summary.testFramework}`);
    }

    if (summary.gitBranch) {
      lines.push(`- Git Branch: ${summary.gitBranch}`);
    }

    if (summary.activeFile) {
      lines.push(
        `- Active File: ${summary.activeFile.relativePath} (Line: ${summary.activeFile.cursorLine || 1} of ${summary.activeFile.lineCount})`
      );
    }

    if (summary.diagnosticsSummary.errorCount > 0) {
      lines.push(
        `- Active Errors (${summary.diagnosticsSummary.errorCount} total): ${summary.diagnosticsSummary.topErrors
          .map(e => `[${e.file}:${e.line}] ${e.message}`)
          .join('; ')}`
      );
    } else {
      lines.push(`- Active Errors: 0 (Code looks clean!)`);
    }

    return lines.join('\n');
  }
}
