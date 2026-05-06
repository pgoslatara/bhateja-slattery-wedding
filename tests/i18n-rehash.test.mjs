import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeContentDir } from './helpers/tmpdir.mjs';
import { rehash } from '../scripts/i18n-rehash.mjs';
import { sha256 } from '../scripts/i18n-check.mjs';

test('inserts enHash when missing', () => {
  const dir = makeContentDir();
  try {
    const en = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody\n';
    dir.write('schedule/01-event.en.md', en);
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\n---\nbody hindi\n');
    const result = rehash({ contentRoot: dir.root, name: '01-event' });
    assert.equal(result.updated.length, 1);
    const hi = readFileSync(`${dir.root}/schedule/01-event.hi.md`, 'utf8');
    assert.match(hi, new RegExp(`enHash:\\s*${sha256(en)}`));
  } finally {
    dir.cleanup();
  }
});

test('replaces stale enHash', () => {
  const dir = makeContentDir();
  try {
    const en = '---\nday: 1\norder: 1\nname: A\nstartTime: TBD\nendTime: TBD\n---\nbody v2\n';
    dir.write('schedule/01-event.en.md', en);
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\nenHash: 0000000000000000000000000000000000000000000000000000000000000000\n---\nbody hindi\n');
    rehash({ contentRoot: dir.root, name: '01-event' });
    const hi = readFileSync(`${dir.root}/schedule/01-event.hi.md`, 'utf8');
    assert.match(hi, new RegExp(`enHash:\\s*${sha256(en)}`));
    assert.doesNotMatch(hi, /enHash:\s*0{64}/);
  } finally {
    dir.cleanup();
  }
});

test('throws when no English match exists', () => {
  const dir = makeContentDir();
  try {
    dir.write('schedule/01-event.hi.md', '---\nday: 1\norder: 1\nname: B\nstartTime: TBD\nendTime: TBD\n---\nbody\n');
    assert.throws(
      () => rehash({ contentRoot: dir.root, name: '01-event' }),
      /no matching .*\.en\.md/i
    );
  } finally {
    dir.cleanup();
  }
});

test('throws when name not provided', () => {
  const dir = makeContentDir();
  try {
    assert.throws(() => rehash({ contentRoot: dir.root, name: undefined }), /name is required/i);
  } finally {
    dir.cleanup();
  }
});
