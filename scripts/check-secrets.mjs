import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const skippedDirectories = new Set(['.git', '.data', 'coverage', 'node_modules']);
const textExtensions = new Set([
  '',
  '.css',
  '.env',
  '.example',
  '.html',
  '.ini',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.sh',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const forbiddenEnvironmentFiles = /^\.env(?:\..+)?$/;
const allowedEnvironmentFiles = new Set(['.env.example']);
const trackedFiles = new Set(
  execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
);

const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Shopify credential', /\b(?:shpat|shpca|shppa|shpss)_[A-Za-z0-9]{16,}\b/g],
  ['OpenRouter credential', /\bsk-or-v1-[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub credential', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Stripe live key', /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g],
  [
    'non-empty secret assignment',
    /(?:OPENROUTER_API_KEY|SHOPIFY_CLIENT_SECRET|APP_ENCRYPTION_KEY|SITE_ACCESS_PASSWORD)[ \t]*=[ \t]*["']?([^\s"'#]{8,})/g,
  ],
];
const forbiddenBundleTerms = [
  'APP_ENCRYPTION_KEY',
  'OPENROUTER_API_KEY',
  'SHOPIFY_CLIENT_SECRET',
  'SITE_ACCESS_PASSWORD',
  'Shopify-Storefront-Private-Token',
  'X-Shopify-Access-Token',
];

async function collectFiles(directory, files = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }
  return files;
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

const findings = [];
for (const filePath of await collectFiles(root)) {
  const relativePath = path.relative(root, filePath);
  const basename = path.basename(filePath);
  const isPrivateEnvironmentFile =
    forbiddenEnvironmentFiles.test(basename) && !allowedEnvironmentFiles.has(basename);
  if (isPrivateEnvironmentFile) {
    if (trackedFiles.has(relativePath)) {
      findings.push(`${relativePath}: archivo de entorno que no debe versionarse`);
    }
    continue;
  }
  if (!isTextFile(filePath)) continue;

  const content = await fs.readFile(filePath, 'utf8');
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${relativePath}: posible ${label}`);
  }

  if (relativePath.startsWith(`dist${path.sep}`)) {
    for (const term of forbiddenBundleTerms) {
      if (content.includes(term)) {
        findings.push(`${relativePath}: término reservado presente en el bundle (${term})`);
      }
    }
  }
}

if (findings.length) {
  console.error('La comprobación de secretos ha fallado:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.info('Secret scan: sin credenciales ni nombres de secretos en el bundle.');
}
