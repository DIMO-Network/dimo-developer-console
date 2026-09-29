// Generates (once) the RSA key that signs the harness session JWT and a Turnkey
// credential bundle the app can decrypt. Cached in .keys.json (gitignored).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateKeyPair, exportJWK, SignJWT, decodeJwt } from 'jose';
import { generateP256KeyPair, hpkeEncrypt } from '@turnkey/crypto';
import { uint8ArrayFromHexString } from '@turnkey/encoding';
import bs58check from 'bs58check';
import { USER_EMAIL, LICENSE } from './fixtures.mjs';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.keys.json');
export const ISSUER = 'http://localhost:3001';

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

async function generate() {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = {
    ...(await exportJWK(publicKey)),
    kid: 'harness',
    alg: 'RS256',
    use: 'sig',
  };
  const sessionJwt = await new SignJWT({ email: USER_EMAIL })
    .setProtectedHeader({ alg: 'RS256', kid: 'harness' })
    .setIssuer(ISSUER)
    .setSubject('user-harness')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(privateKey);
  const embedded = generateP256KeyPair();
  const credential = generateP256KeyPair();
  const credentialBundle = bs58check.encode(
    hpkeEncrypt({
      plainTextBuf: uint8ArrayFromHexString(credential.privateKey),
      targetKeyBuf: uint8ArrayFromHexString(embedded.publicKeyUncompressed),
    }),
  );
  // Only ever jwtDecode-d by the app, so it is unsigned.
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  const devJwt = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ aud: LICENSE.clientId, exp })}.`;
  return {
    publicJwk,
    sessionJwt,
    embeddedPrivateKey: embedded.privateKey,
    credentialBundle,
    devJwt,
  };
}

export async function loadKeys() {
  try {
    const keys = JSON.parse(await fs.readFile(FILE, 'utf8'));
    if (decodeJwt(keys.sessionJwt).exp * 1000 > Date.now() + 86400_000) return keys;
  } catch {
    // missing or unreadable: regenerate
  }
  const keys = await generate();
  await fs.writeFile(FILE, JSON.stringify(keys, null, 2));
  return keys;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await loadKeys();
  console.log(`[keys] ${FILE}`);
}
