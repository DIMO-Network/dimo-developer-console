/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
const source = (dir: string) =>
  walk(path.join(root, dir)).filter((f) => /\.(ts|tsx)$/.test(f));
const read = (file: string) =>
  fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8');
const rel = (file: string) => path.relative(root, file);

describe('invite acceptance ordering (contracts C4)', () => {
  it('never runs on the guest sign-in or sign-up pages, so it follows the whole sign-up', () => {
    for (const file of [...source('src/app/sign-in'), ...source('src/app/sign-up')]) {
      expect(read(file)).not.toMatch(
        /AuthorizedLayout|TeamProvider|withTeams|PendingInvite|actions\/invites/,
      );
    }
    expect(read('src/layouts/AuthorizedLayout/AuthorizedLayout.tsx')).toMatch(
      /withTeams\(/,
    );
    expect(read('src/hoc/TeamProvider.tsx')).toMatch(/<PendingInvite/);
  });

  it('keeps the HttpOnly invite token server-side and deletes it only where C4 allows', () => {
    const users = source('src')
      .filter((f) => read(f).includes('INVITE_TOKEN_COOKIE'))
      .map(rel)
      .sort();
    expect(users).toEqual([
      'src/actions/invites.ts',
      'src/actions/user.ts',
      'src/utils/inviteCookie.ts',
      'src/utils/teamCookies.ts',
    ]);
    for (const file of users) expect(read(file)).not.toMatch(/^'use client'/m);
    const deleters = source('src')
      .filter((f) => /delete\(INVITE_TOKEN_COOKIE\)/.test(read(f)))
      .map(rel)
      .sort();
    expect(deleters).toEqual(['src/actions/invites.ts', 'src/actions/user.ts']);
  });
});
