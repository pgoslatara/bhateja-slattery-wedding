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
    dir.write('schedule/01-event.en.md', '---\nday: 1\norder: 1\nname: x\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: y\nstartTime: TBD\nendTime: TBD\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody\n');
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0);
  } finally {
    dir.cleanup();
  }
});
