import { readFileSync } from 'fs';
import path from 'path';

// The console signs with the same Turnkey, viem and ZeroDev versions as DIMO Driver,
// and they only work as a set. With @turnkey/viem 0.14.43, @zerodev/sdk 5.5.7 and
// later hand smart-account signatures to Turnkey as EIP-712 data with an empty domain,
// so the signatures don't verify: sign-in and SACD grants break. Move these together
// with DIMO Driver, and check a signature on chain when you do.
const SIGNING_SET: Record<string, string> = {
  '@turnkey/crypto': '2.13.2',
  '@turnkey/http': '6.6.0',
  '@turnkey/sdk-browser': '8.6.0',
  '@turnkey/sdk-server': '8.6.0',
  '@turnkey/viem': '0.14.43',
  '@zerodev/ecdsa-validator': '5.4.9',
  '@zerodev/sdk': '5.5.6',
  'viem': '2.56.8',
};

const readJson = (file: string) =>
  JSON.parse(readFileSync(path.join(__dirname, '../../..', file), 'utf8'));

describe('signing libraries', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');

  it.each(Object.entries(SIGNING_SET))('%s is pinned to exactly %s', (name, version) => {
    expect(pkg.dependencies[name]).toBe(version);
  });

  it.each(Object.entries(SIGNING_SET))('every installed %s is %s', (name, version) => {
    const installed = Object.entries(lock.packages as Record<string, { version: string }>)
      .filter(([location]) => location.endsWith(`node_modules/${name}`))
      .map(([, entry]) => entry.version);
    expect(installed.length).toBeGreaterThan(0);
    expect(new Set(installed)).toEqual(new Set([version]));
  });
});
