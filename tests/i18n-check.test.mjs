import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeContentDir } from './helpers/tmpdir.mjs';
import { runCheck } from '../scripts/i18n-check.mjs';

test('reports missing Hindi pair', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'missing_pair' && e.path.endsWith('01-event.hi.md')));
  } finally {
    dir.cleanup();
  }
});

test('reports missing English pair', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'missing_pair' && e.path.endsWith('01-event.en.md')));
  } finally {
    dir.cleanup();
  }
});

test('clean tree returns no errors', () => {
  const dir = makeContentDir();
  try {
    const enContents = '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n';
    // Hash computed with: node -e "const {createHash}=require('crypto'); console.log(createHash('sha256').update('<contents>').digest('hex'))"
    const enHash = '25cd08688a0687ce38468174fad32d5e9ade6d6d276d6ccedf3fcc175695811e';
    dir.write('schedule/01-event.en.md', enContents);
    dir.write('schedule/01-event.hi.md', `---\nday: 1\norder: 1\nname: y\nstartTime: TBD\nendTime: TBD\nenHash: ${enHash}\n---\nbody\n`);
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0);
  } finally {
    dir.cleanup();
  }
});

test('reports invariant frontmatter mismatch on schedule entries', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: A\nstartTime: "10:00"\nendTime: "11:00"\n---\nbody\n');
    dir.write('schedule/01-event.hi.md', '---\nday: 2\norder: 1\nname: B\nstartTime: "10:00"\nendTime: "11:00"\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'invariant_mismatch' && e.field === 'day'));
  } finally {
    dir.cleanup();
  }
});

test('reports stale enHash', () => {
  const dir = makeContentDir();
  try {
    const enContents = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody v2\n';
    dir.write('schedule/01-event.en.md', enContents);
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody hindi\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'stale_hash'));
  } finally {
    dir.cleanup();
  }
});

test('reports missing enHash on Hindi file', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\n---\nbody hindi\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'missing_hash'));
  } finally {
    dir.cleanup();
  }
});

test('clean tree with valid hash returns no errors', async () => {
  const dir = makeContentDir();
  try {
    const enContents = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody\n';
    dir.write('schedule/01-event.en.md', enContents);
    // Compute the expected hash of the en file using the same algorithm the script uses.
    const { createHash } = await import('node:crypto');
    const enHash = createHash('sha256').update(enContents).digest('hex');
    dir.write('schedule/01-event.hi.md', `---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\nenHash: ${enHash}\n---\nbody hindi\n`);
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0);
  } finally {
    dir.cleanup();
  }
});
