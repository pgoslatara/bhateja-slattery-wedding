import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeContentDir } from './helpers/tmpdir.mjs';
import { runCheck, sha256 } from '../scripts/i18n-check.mjs';

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

test('vendors array parity: passes when only note differs', () => {
  const dir = makeContentDir();
  try {
    const en = `---
title: Thanks
vendors:
  - slug: studio-x
    name: Studio X
    category: photography
    website: https://studiox.example
    note: Captured every quiet moment.
---
Intro paragraph.
`;
    const enHash = sha256(en);
    const hi = `---
title: धन्यवाद
enHash: ${enHash}
vendors:
  - slug: studio-x
    name: Studio X
    category: photography
    website: https://studiox.example
    note: हर शांत पल को कैद किया।
---
परिचय।
`;
    dir.write('pages/thanks.en.md', en);
    dir.write('pages/thanks.hi.md', hi);
    const errors = runCheck({ contentRoot: dir.root });
    assert.equal(errors.length, 0, JSON.stringify(errors));
  } finally {
    dir.cleanup();
  }
});

test('vendors array parity: reports mismatched slug', () => {
  const dir = makeContentDir();
  try {
    const en = `---
title: Thanks
vendors:
  - slug: studio-x
    name: Studio X
    category: photography
    note: a.
---
i.
`;
    const enHash = sha256(en);
    const hi = `---
title: धन्यवाद
enHash: ${enHash}
vendors:
  - slug: studio-y
    name: Studio X
    category: photography
    note: b.
---
i.
`;
    dir.write('pages/thanks.en.md', en);
    dir.write('pages/thanks.hi.md', hi);
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'invariant_mismatch' && e.field === 'vendors[0].slug'));
  } finally {
    dir.cleanup();
  }
});

test('vendors array parity: reports length mismatch', () => {
  const dir = makeContentDir();
  try {
    const en = `---
title: Thanks
vendors:
  - slug: a
    name: A
    category: photography
    note: a.
  - slug: b
    name: B
    category: decor
    note: b.
---
i.
`;
    const enHash = sha256(en);
    const hi = `---
title: धन्यवाद
enHash: ${enHash}
vendors:
  - slug: a
    name: A
    category: photography
    note: क.
---
i.
`;
    dir.write('pages/thanks.en.md', en);
    dir.write('pages/thanks.hi.md', hi);
    const errors = runCheck({ contentRoot: dir.root });
    assert.ok(errors.some(e => e.code === 'invariant_mismatch' && e.field === 'vendors.length'));
  } finally {
    dir.cleanup();
  }
});
