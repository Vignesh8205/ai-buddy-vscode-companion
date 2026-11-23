import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Test Sensitive File Filter
test('Workspace Privacy: strictly excludes sensitive secret files', () => {
  function isSensitiveFile(filePath) {
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

  // Sensitive paths that MUST be blocked
  assert.equal(isSensitiveFile('.env'), true);
  assert.equal(isSensitiveFile('.env.production'), true);
  assert.equal(isSensitiveFile('config/secrets.json'), true);
  assert.equal(isSensitiveFile('ssh/id_rsa'), true);
  assert.equal(isSensitiveFile('certs/server.key'), true);
  assert.equal(isSensitiveFile('certs/tls.pem'), true);
  assert.equal(isSensitiveFile('auth/token_store.ts'), true);
  assert.equal(isSensitiveFile('aws/credentials'), true);

  // Safe developer project paths that MUST be allowed
  assert.equal(isSensitiveFile('src/extension.ts'), false);
  assert.equal(isSensitiveFile('tests/login.spec.ts'), false);
  assert.equal(isSensitiveFile('playwright.config.ts'), false);
  assert.equal(isSensitiveFile('package.json'), false);
  assert.equal(isSensitiveFile('README.md'), false);
});

// 2. Test Context Prompt Formatter
test('Context Engine: formats project telemetry concisely for Gemini without bloat', () => {
  function formatContextPrompt(summary) {
    const lines = [
      `[CURRENT WORKSPACE CONTEXT]`,
      `- Project: ${summary.projectName} (${summary.projectType}, ${summary.primaryLanguage})`,
    ];

    if (summary.frameworks && summary.frameworks.length > 0) {
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

    if (summary.diagnosticsSummary && summary.diagnosticsSummary.errorCount > 0) {
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

  const sampleSummary = {
    projectName: 'my-e2e-suite',
    projectType: 'Node.js',
    frameworks: ['React', 'TypeScript'],
    testFramework: 'Playwright',
    primaryLanguage: 'TypeScript',
    gitBranch: 'main',
    activeFile: {
      name: 'checkout.spec.ts',
      relativePath: 'tests/checkout.spec.ts',
      languageId: 'typescript',
      lineCount: 85,
      cursorLine: 42,
    },
    diagnosticsSummary: {
      errorCount: 1,
      warningCount: 0,
      topErrors: [
        {
          file: 'checkout.spec.ts',
          line: 42,
          message: "Type 'string' is not assignable to type 'number'.",
          source: 'ts',
        },
      ],
    },
    lastUpdated: Date.now(),
  };

  const formatted = formatContextPrompt(sampleSummary);
  assert.ok(formatted.includes('Project: my-e2e-suite (Node.js, TypeScript)'));
  assert.ok(formatted.includes('Frameworks: React, TypeScript'));
  assert.ok(formatted.includes('Test Framework: Playwright'));
  assert.ok(formatted.includes('Active File: tests/checkout.spec.ts (Line: 42 of 85)'));
  assert.ok(formatted.includes("Active Errors (1 total): [checkout.spec.ts:42] Type 'string' is not assignable"));
});

// 3. Test Error Signature Deduplication
test('Workspace Monitor: deduplicates identical diagnostic alerts to avoid annoying the user', () => {
  let lastErrorSignature = '';
  let alertCount = 0;

  function onDiagnosticsCheck(topError) {
    const signature = `${topError.file}:${topError.line}:${topError.message}`;
    if (signature !== lastErrorSignature) {
      lastErrorSignature = signature;
      alertCount++;
      return true; // Alert emitted
    }
    return false; // Suppressed duplicate
  }

  const err1 = { file: 'index.ts', line: 10, message: 'Cannot find module express' };
  assert.equal(onDiagnosticsCheck(err1), true);
  assert.equal(alertCount, 1);

  // Subsequent check with the exact same error: must be suppressed
  assert.equal(onDiagnosticsCheck(err1), false);
  assert.equal(alertCount, 1);

  // New error: must trigger alert
  const err2 = { file: 'index.ts', line: 15, message: 'Unexpected token' };
  assert.equal(onDiagnosticsCheck(err2), true);
  assert.equal(alertCount, 2);
});
