#!/usr/bin/env node
// Manual, read-only production check. Never prints credentials, source or API bodies.
import { readFile } from 'node:fs/promises';
import { StorageRulesReadError, parseStorageRulesArgs, readStorageRulesDrift } from './storage-rules-reader.mjs';

try {
  if (process.env.CI) throw new StorageRulesReadError('LIVE_AUDIT_FORBIDDEN_IN_CI');
  const options = parseStorageRulesArgs(process.argv.slice(2));
  if (process.stdin.isTTY) throw new StorageRulesReadError('TOKEN_MUST_BE_PIPED_NOT_TYPED');
  let expectedSource;
  try {
    const bytes = await readFile(options.rules);
    if (bytes.length > 1024 * 1024) throw new Error('oversized');
    // ignoreBOM preserves a UTF-8 BOM in the decoded string and therefore in its hash.
    expectedSource = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch { throw new StorageRulesReadError('LOCAL_STORAGE_RULES_UNREADABLE_OR_INVALID'); }
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (input.length > 16_384) throw new StorageRulesReadError('TOKEN_INPUT_TOO_LARGE');
  }
  const report = await readStorageRulesDrift(options, { expectedSource, accessToken: input.trim() });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.match ? 0 : 2;
} catch (error) {
  console.error(JSON.stringify({ complete: false, writes: 0, error: error instanceof StorageRulesReadError ? error.message : 'STORAGE_RULES_AUDIT_FAILED' }));
  process.exitCode = 1;
}
