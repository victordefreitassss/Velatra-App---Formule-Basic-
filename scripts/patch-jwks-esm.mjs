import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Temporary compatibility patch for Vercel's require(ESM)-restricted runtime.
// Keep current jose cryptography; change only how the existing async function loads it.
// Upstream: https://github.com/firebase/firebase-admin-node/issues/3181
const require = createRequire(import.meta.url);
const adminRequire = createRequire(require.resolve('firebase-admin'));
const directory = path.dirname(adminRequire.resolve('jwks-rsa'));
const file = path.join(directory, 'utils.js');
const source = readFileSync(file, 'utf8');
const marker = "  const jose = await import('jose'); // Velatra: serverless ESM compatibility";
if (!source.includes(marker)) {
  const expected = 'c535773fd798202296e846e7c057f96f631148686194ff2990f0729fa4c1b7af';
  if (createHash('sha256').update(source).digest('hex') !== expected) {
    throw new Error('jwks-rsa changed: review/remove the ESM compatibility patch before upgrading.');
  }
  const patched = source.replace("const jose = require('jose');\n", '')
    .replace('async function retrieveSigningKeys(jwks) {', `async function retrieveSigningKeys(jwks) {\n${marker}`);
  writeFileSync(file, patched);
}
// The package's entrypoint also eagerly imports its optional Passport integration.
const passportFile = path.join(directory, 'integrations/passport.js');
const passportSource = readFileSync(passportFile, 'utf8');
if (!passportSource.includes(marker.trim())) {
  const expected = '03557fac70296dda6d19872b1702d2b8f1d4c50d22d3fbcf1fb65f9afa7ddcbb';
  if (createHash('sha256').update(passportSource).digest('hex') !== expected) {
    throw new Error('jwks-rsa Passport integration changed: review the ESM compatibility patch.');
  }
  const patched = passportSource.replace("const jose = require('jose');\n", '')
    .replace('return function secretProvider(req, rawJwtToken, cb)', 'return async function secretProvider(req, rawJwtToken, cb)')
    .replace('    try {', `    try {\n    ${marker}`);
  writeFileSync(passportFile, patched);
}
console.log('jwks-rsa ESM compatibility patch verified.');
