#!/usr/bin/env node
// No app imports, no Admin SDK, no credentials in argv or output, no file writes.
import { auditMemberAssignments } from './member-assignment-classifier.mjs';
import { AuditReadError, parseAuditArgs, readUserProfiles } from './member-assignment-reader.mjs';

try {
  if (process.env.CI) throw new AuditReadError('LIVE_AUDIT_FORBIDDEN_IN_CI');
  const options = parseAuditArgs(process.argv.slice(2));
  let accessToken;
  if (options.tokenStdin) {
    if (process.stdin.isTTY) throw new AuditReadError('TOKEN_MUST_BE_PIPED_NOT_TYPED');
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk.toString();
      if (input.length > 16_384) throw new AuditReadError('TOKEN_INPUT_TOO_LARGE');
    }
    accessToken = input.trim();
  }
  const { users, evidence } = await readUserProfiles(options, { accessToken });
  const report = auditMemberAssignments(users, { environment: options.environment, scope: `${options.project}/${options.database}` });
  console.log(JSON.stringify({ evidence, ...report }, null, 2));
} catch (error) {
  // Never echo server bodies, arguments, input profiles, OAuth tokens or stack traces.
  console.error(JSON.stringify({ complete: false, writes: 0, error: error instanceof AuditReadError ? error.message : 'AUDIT_FAILED_NO_REPORT' }));
  process.exitCode = 1;
}
