import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe.skipIf(process.platform !== 'linux')('Linux launcher', () => {
  it('follows Debian-style symlinks and passes the MR URL through unchanged', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'githome-launcher-'));
    try {
      const install = path.join(root, 'GitHome install');
      const bin = path.join(root, 'usr-bin');
      const alternatives = path.join(root, 'alternatives');
      for (const dir of [install, bin, alternatives]) mkdirSync(dir);

      const launcher = path.join(install, 'githome');
      const link = path.join(bin, 'githome');
      copyFileSync(
        fileURLToPath(new URL('./linux-launcher.sh', import.meta.url)),
        launcher,
      );
      chmodSync(launcher, 0o755);
      writeFileSync(
        path.join(install, 'githome-bin'),
        '#!/bin/sh\nprintf "%s\\n" "$@"\n',
        { mode: 0o755 },
      );
      symlinkSync(
        '../GitHome install/githome',
        path.join(alternatives, 'githome'),
      );
      symlinkSync('../alternatives/githome', link);

      const url =
        'https://gitlab.example.com/team/project/-/merge_requests/42?view=parallel#note_1';
      const argv = ['--open-mr', url];
      const run = (launcher: string, args: string[]) =>
        execFileSync(launcher, args, {
          encoding: 'utf8',
          env: { ...process.env, XDG_SESSION_TYPE: 'wayland' },
        })
          .trim()
          .split('\n');

      expect(run(link, argv)).toEqual(['--ozone-platform=wayland', ...argv]);
      expect(run(launcher, ['--ozone-platform=x11', ...argv])).toEqual([
        '--ozone-platform=x11',
        ...argv,
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
