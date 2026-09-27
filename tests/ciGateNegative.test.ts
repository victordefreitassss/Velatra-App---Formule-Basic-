import { it } from 'node:test';
import assert from 'node:assert/strict';

// Temporary PR-only probe. Revert this commit before merging.
it('CI release gate rejects an intentionally failing test', () => {
  assert.fail('Intentional release-gate negative probe; must never reach main.');
});
