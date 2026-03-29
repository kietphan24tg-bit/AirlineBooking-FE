import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const gitDir = path.join(repoRoot, '.git');
const huskyDir = path.join(repoRoot, '.husky');
const huskyInternalDir = path.join(huskyDir, '_');
const gitPaths = [
  'C:\\Program Files\\Git\\cmd',
  'C:\\Program Files\\Git\\bin',
  'C:\\Program Files (x86)\\Git\\cmd',
  'C:\\Program Files (x86)\\Git\\bin',
];
const hookNames = [
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-rebase',
  'post-rewrite',
  'post-checkout',
  'post-merge',
  'pre-push',
  'pre-auto-gc',
];

process.chdir(repoRoot);

if (!existsSync(gitDir)) {
  console.log('Skipping Husky install: .git directory not found.');
  process.exit(0);
}

if (process.platform === 'win32') {
  const pathEntries = new Set((process.env.PATH ?? '').split(path.delimiter));

  for (const gitPath of gitPaths) {
    if (existsSync(gitPath)) {
      pathEntries.add(gitPath);
    }
  }

  process.env.PATH = Array.from(pathEntries).join(path.delimiter);
}

const gitCheck = spawnSync('git', ['--version'], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (gitCheck.status !== 0) {
  console.error(gitCheck.error?.message ?? gitCheck.stderr ?? 'git command not found');
  process.exit(1);
}

const hookPathResult = spawnSync('git', ['-C', repoRoot, 'config', 'core.hooksPath', '.husky/_'], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (hookPathResult.status !== 0) {
  console.error(hookPathResult.stderr || 'Failed to configure Git hooks path.');
  process.exit(1);
}

rmSync(path.join(huskyInternalDir, 'husky.sh'), { force: true });
mkdirSync(huskyInternalDir, { recursive: true });
writeFileSync(path.join(huskyInternalDir, '.gitignore'), '*\n');

copyFileSync(
  path.join(repoRoot, 'node_modules', 'husky', 'husky'),
  path.join(huskyInternalDir, 'h')
);

for (const hookName of hookNames) {
  writeFileSync(
    path.join(huskyInternalDir, hookName),
    '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n',
    { mode: 0o755 }
  );
}

writeFileSync(
  path.join(huskyInternalDir, 'husky.sh'),
  'echo "husky - DEPRECATED\\n\\nPlease remove the following two lines from $0:\\n\\n#!/usr/bin/env sh\\n. \\"$(dirname -- \\"$0\\")/_/husky.sh\\"\\n\\nThey WILL FAIL in v10.0.0\\n"\n'
);
