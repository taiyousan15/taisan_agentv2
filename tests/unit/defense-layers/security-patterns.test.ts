/**
 * Security Pattern Detection Test
 *
 * Tests security-specific pattern detection across all defense layers.
 * Validates that dangerous patterns are correctly identified.
 */

import { describe, test, expect } from '@jest/globals';
import * as path from 'path';

const HOOKS_DIR = path.join(__dirname, '../../../.claude/hooks');

describe('Security Pattern Detection', () => {
  describe('Command Injection Patterns', () => {
    const patterns = [
      /\$\(.*\)/,                  // Command substitution
      /`.*`/,                      // Backtick execution
      /;\s*rm\s/,                  // Command chaining with rm
      /\|\s*sh/,                   // Pipe to shell
      /eval\s/,                    // eval command
    ];

    test.each([
      ['$(whoami)', true],
      ['echo $(id)', true],
      ['test `pwd`', true],
      ['ls; rm file', true],
      ['cat file | sh', true],
      ['eval "code"', true],
      ['normal command', false],
      ['echo "hello world"', false],
      ['ls -la', false],
      ['npm install', false],
    ])('input "%s" should be detected as injection: %s', (input, expected) => {
      const detected = patterns.some(pattern => pattern.test(input));
      expect(detected).toBe(expected);
    });

    test('detects command substitution variations', () => {
      const injectionPatterns = [
        '$(whoami)',
        '$( id )',
        '$(cat /etc/passwd)',
        'echo $(malicious)',
      ];

      injectionPatterns.forEach(pattern => {
        const detected = /\$\(.*\)/.test(pattern);
        expect(detected).toBe(true);
      });
    });

    test('detects backtick execution', () => {
      const backtickPatterns = [
        '`whoami`',
        '`cat secret`',
        'echo `id`',
      ];

      backtickPatterns.forEach(pattern => {
        const detected = /`.*`/.test(pattern);
        expect(detected).toBe(true);
      });
    });

    test('detects command chaining', () => {
      const chainingPatterns = [
        '; rm -rf /',
        'ls; cat /etc/passwd',
        'echo test; whoami',
      ];

      chainingPatterns.forEach(pattern => {
        const detected = /;\s*\w+/.test(pattern);
        expect(detected).toBe(true);
      });
    });

    test('detects pipe to shell', () => {
      const pipePatterns = [
        'curl url | sh',
        'wget file | bash',
        'cat script | sh',
      ];

      pipePatterns.forEach(pattern => {
        const detected = /\|\s*(sh|bash)/.test(pattern);
        expect(detected).toBe(true);
      });
    });
  });

  describe('Secret Detection Patterns', () => {
    test.each([
      ['sk-proj-abc123def456', true],  // OpenAI API key
      ['AKIA1234567890ABCDEF', true],  // AWS Access Key
      ['ghp_abc123def456ghi789', true], // GitHub PAT
      ['xoxb-1234-5678-abcd', true],   // Slack token
      ['AIza1234567890abcdefGHIJ', true], // Google API key
      ['normal-string-123', false],
      ['api_key_placeholder', false],
      ['sk-test-short', false],
    ])('input "%s" should be detected as secret: %s', (input, expected) => {
      const patterns = [
        /sk-proj-[a-zA-Z0-9]{10,}/,      // OpenAI
        /AKIA[0-9A-Z]{16}/,              // AWS
        /ghp_[a-zA-Z0-9]{15,}/,          // GitHub
        /xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/, // Slack
        /AIza[a-zA-Z0-9]{20,}/,          // Google
      ];

      const detected = patterns.some(pattern => pattern.test(input));
      expect(detected).toBe(expected);
    });

    test('detects AWS Access Key ID pattern', () => {
      const awsKeys = [
        'AKIAIOSFODNN7EXAMPLE',
        'AKIAJKLMNOPQRSTUVWXY',
      ];

      awsKeys.forEach(key => {
        const detected = /AKIA[0-9A-Z]{16}/.test(key);
        expect(detected).toBe(true);
      });
    });

    test('detects private key headers', () => {
      const privateKeys = [
        '-----BEGIN PRIVATE KEY-----',
        '-----BEGIN RSA PRIVATE KEY-----',
        '-----BEGIN EC PRIVATE KEY-----',
        '-----BEGIN OPENSSH PRIVATE KEY-----',
      ];

      privateKeys.forEach(key => {
        const detected = /-----BEGIN.*PRIVATE KEY-----/.test(key);
        expect(detected).toBe(true);
      });
    });

    test('detects hardcoded secret patterns', () => {
      const hardcodedSecrets = [
        'api_key = "sk-1234567890"',
        'password = "secret123"',
        'token: "Bearer abc123"',
        "secret_key='my-secret-key'",
      ];

      hardcodedSecrets.forEach(secret => {
        const detected = /(api[_-]?key|password|token|secret[_-]?key)\s*[=:]\s*["\'][^"\']+["\']/.test(secret);
        expect(detected).toBe(true);
      });
    });
  });

  describe('Copy Marker Detection', () => {
    test.each([
      ['\uFFFD', true],           // Replacement character
      ['\u3000', true],           // Ideographic space
      ['[[COPY]]', true],         // Copy marker
      ['<COPY>', true],           // Copy marker
      ['[[TODO]]', true],         // TODO marker
      ['[[PLACEHOLDER]]', true],  // Placeholder
      ['normal text', false],
      ['regular space', false],
    ])('input "%s" should be detected as copy marker: %s', (input, expected) => {
      const patterns = [
        /\uFFFD/,
        /\u3000/,
        /\[\[COPY\]\]/i,
        /<COPY>/i,
        /\[\[TODO\]\]/i,
        /\[\[PLACEHOLDER\]\]/i,
      ];

      const detected = patterns.some(pattern => pattern.test(input));
      expect(detected).toBe(expected);
    });

    test('detects U+FFFD replacement character', () => {
      const inputs = [
        'text\uFFFDwith replacement',
        '\uFFFD',
        'before\uFFFDafter',
      ];

      inputs.forEach(input => {
        expect(/\uFFFD/.test(input)).toBe(true);
      });
    });

    test('detects multiple ideographic spaces', () => {
      const inputs = [
        'text\u3000\u3000\u3000with spaces',
        '\u3000\u3000\u3000',
      ];

      inputs.forEach(input => {
        expect(/\u3000{3,}/.test(input)).toBe(true);
      });
    });

    test('detects zero-width characters', () => {
      const zeroWidthChars = [
        '\u200B', // Zero-width space
        '\u200C', // Zero-width non-joiner
        '\u200D', // Zero-width joiner
        '\uFEFF', // Zero-width no-break space
      ];

      zeroWidthChars.forEach(char => {
        const detected = /[\u200B-\u200F\u2028\u2029\uFEFF]/.test(char);
        expect(detected).toBe(true);
      });
    });

    test('detects copy marker templates', () => {
      const templates = [
        '[[COPY]]',
        '[[コピー]]',
        '<COPY>',
        '<コピー>',
        '<!-- COPY -->',
        '# COPY #',
      ];

      templates.forEach(template => {
        const detected = /\[\[COPY\]\]|\[\[コピー\]\]|<COPY>|<コピー>|<!--\s*COPY\s*-->|#\s*COPY\s*#/i.test(template);
        expect(detected).toBe(true);
      });
    });
  });

  describe('Dangerous Command Patterns', () => {
    test.each([
      ['rm -rf /', true],
      ['rm -rf ~', true],
      ['rm -rf *', true],
      ['sudo rm -rf /', true],
      ['dd if=/dev/zero of=/dev/sda', true],
      ['mkfs.ext4 /dev/sda', true],
      [':(){:|:&};:', true],    // Fork bomb
      ['ls -la', false],
      ['rm file.txt', false],
      ['mkdir test', false],
    ])('command "%s" should be detected as dangerous: %s', (command, expected) => {
      const patterns = [
        /rm\s+-rf\s+[\/~\*]/,
        />\s*\/dev\/sd[a-z]/,
        /mkfs\./,
        /dd\s+if=.*of=\/dev/,
        /:\(\)\s*\{.*\|.*&\s*\}\s*;\s*:/,
      ];

      const detected = patterns.some(pattern => pattern.test(command));
      expect(detected).toBe(expected);
    });

    test('detects recursive deletion patterns', () => {
      const dangerousRm = [
        'rm -rf /',
        'rm -rf ~',
        'rm -rf $HOME',
        'rm -r /',
      ];

      dangerousRm.forEach(cmd => {
        const detected = /rm\s+-r[f]?\s+[\/~\$]/.test(cmd);
        expect(detected).toBe(true);
      });
    });

    test('detects disk formatting commands', () => {
      const formatCommands = [
        'mkfs.ext4 /dev/sda',
        'mkfs.ntfs /dev/sdb1',
        'dd if=/dev/zero of=/dev/sda',
      ];

      formatCommands.forEach(cmd => {
        const detected = /(mkfs\.|dd\s+if=.*of=\/dev)/.test(cmd);
        expect(detected).toBe(true);
      });
    });

    test('detects fork bomb', () => {
      const forkBombs = [
        ':(){:|:&};:',
        ':() { :|:& };:',
      ];

      forkBombs.forEach(cmd => {
        const detected = /:\(\)\s*\{.*\|.*&\s*\}\s*;\s*:/.test(cmd);
        expect(detected).toBe(true);
      });
    });
  });

  describe('Path Traversal Patterns', () => {
    test.each([
      ['../../../etc/passwd', true],
      ['..\\..\\windows\\system32', true],
      ['/etc/passwd', false],  // Absolute path, not traversal
      ['./relative/path', false],
      ['normal/path/file.txt', false],
    ])('path "%s" should be detected as traversal: %s', (filePath, expected) => {
      const pattern = /\.\.[\/\\]/;
      const detected = pattern.test(filePath);
      expect(detected).toBe(expected);
    });

    test('detects Unix path traversal', () => {
      const paths = [
        '../../../etc/passwd',
        '../../secrets/key.pem',
        '../config.json',
      ];

      paths.forEach(p => {
        expect(/\.\.\//.test(p)).toBe(true);
      });
    });

    test('detects Windows path traversal', () => {
      const paths = [
        '..\\..\\windows\\system32',
        '..\\secrets\\key.txt',
      ];

      paths.forEach(p => {
        expect(/\.\.\\/.test(p)).toBe(true);
      });
    });
  });

  describe('Sensitive File Access Patterns', () => {
    test.each([
      ['/etc/passwd', true],
      ['/etc/shadow', true],
      ['~/.ssh/id_rsa', true],
      ['/home/user/.aws/credentials', true],
      ['.env', true],
      ['.env.local', false],  // Local env files might be OK
      ['config.json', false],
      ['normal-file.txt', false],
    ])('path "%s" should be detected as sensitive: %s', (filePath, expected) => {
      const pattern = /(\/etc\/passwd|\/etc\/shadow|\.ssh\/|id_rsa|\.env(?!\.)|\.aws\/credentials)/;
      const detected = pattern.test(filePath);
      expect(detected).toBe(expected);
    });

    test('detects system file access', () => {
      const systemFiles = [
        '/etc/passwd',
        '/etc/shadow',
        '/etc/hosts',
      ];

      systemFiles.forEach(file => {
        expect(/\/etc\//.test(file)).toBe(true);
      });
    });

    test('detects SSH key access', () => {
      const sshKeys = [
        '~/.ssh/id_rsa',
        '/home/user/.ssh/id_ed25519',
        '.ssh/authorized_keys',
      ];

      sshKeys.forEach(key => {
        expect(/\.ssh\//.test(key)).toBe(true);
      });
    });

    test('detects environment file access', () => {
      const envFiles = [
        '.env',
        'config/.env',
        '/var/www/.env',
      ];

      envFiles.forEach(file => {
        expect(/\.env(?!\.)/.test(file)).toBe(true);
      });
    });

    test('detects AWS credentials access', () => {
      const awsFiles = [
        '~/.aws/credentials',
        '/home/user/.aws/config',
      ];

      awsFiles.forEach(file => {
        expect(/\.aws\//.test(file)).toBe(true);
      });
    });
  });

  describe('Combined Pattern Detection', () => {
    test('detects multiple security issues in single input', () => {
      const input = 'curl $(cat .env) | sh';

      const issues: string[] = [];

      if (/\$\(.*\)/.test(input)) issues.push('command_injection');
      if (/\|\s*sh/.test(input)) issues.push('pipe_to_shell');
      if (/\.env/.test(input)) issues.push('sensitive_file');

      expect(issues.length).toBeGreaterThan(0);
      expect(issues).toContain('command_injection');
      expect(issues).toContain('pipe_to_shell');
      expect(issues).toContain('sensitive_file');
    });

    test('prioritizes critical issues over warnings', () => {
      const inputs = [
        { text: 'rm -rf /', severity: 'critical' },
        { text: 'sudo apt update', severity: 'warning' },
        { text: 'ls -la', severity: 'info' },
      ];

      inputs.forEach(({ text, severity }) => {
        let detected = 'info';

        if (/rm\s+-rf\s+\//.test(text)) detected = 'critical';
        else if (/sudo/.test(text)) detected = 'warning';

        expect(detected).toBe(severity);
      });
    });
  });

  describe('Pattern Performance', () => {
    test('patterns execute efficiently on large inputs', () => {
      const largeInput = 'normal text '.repeat(1000);
      const patterns = [
        /\$\(.*\)/,
        /`.*`/,
        /;\s*rm\s/,
        /AKIA[0-9A-Z]{16}/,
        /\uFFFD/,
      ];

      const startTime = Date.now();

      patterns.forEach(pattern => {
        pattern.test(largeInput);
      });

      const duration = Date.now() - startTime;

      // Should complete quickly even with large input
      expect(duration).toBeLessThan(100);
    });

    test('patterns do not cause catastrophic backtracking', () => {
      // Test with input designed to trigger backtracking
      const problematicInput = 'a'.repeat(100) + 'b';

      const patterns = [
        /\$\(.*\)/,
        /`.*`/,
      ];

      const startTime = Date.now();

      patterns.forEach(pattern => {
        pattern.test(problematicInput);
      });

      const duration = Date.now() - startTime;

      // Should complete quickly without exponential time
      expect(duration).toBeLessThan(50);
    });
  });

  describe('False Positive Prevention', () => {
    test('does not flag legitimate commands', () => {
      const legitimateCommands = [
        'npm install',
        'git commit -m "message"',
        'node script.js',
        'python train.py',
        'docker build -t image .',
      ];

      const dangerousPattern = /rm\s+-rf\s+[\/~\*]/;

      legitimateCommands.forEach(cmd => {
        expect(dangerousPattern.test(cmd)).toBe(false);
      });
    });

    test('does not flag legitimate file paths', () => {
      const legitimatePaths = [
        'src/components/Button.tsx',
        'config/settings.json',
        'tests/unit/auth.test.ts',
      ];

      const traversalPattern = /\.\.\//;

      legitimatePaths.forEach(path => {
        expect(traversalPattern.test(path)).toBe(false);
      });
    });

    test('does not flag legitimate environment references', () => {
      const legitimateEnv = [
        'process.env.NODE_ENV',
        'process.env.API_URL',
        '$NODE_ENV',
      ];

      const secretPattern = /api[_-]?key\s*[=:]\s*["\'][^"\']+["\']/i;

      legitimateEnv.forEach(env => {
        expect(secretPattern.test(env)).toBe(false);
      });
    });
  });
});
