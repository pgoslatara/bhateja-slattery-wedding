import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function makeContentDir() {
  const root = mkdtempSync(join(tmpdir(), 'i18n-test-'));
  return {
    root,
    write(relPath, contents) {
      const abs = join(root, relPath);
      mkdirSync(join(abs, '..'), { recursive: true });
      writeFileSync(abs, contents);
      return abs;
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    }
  };
}
