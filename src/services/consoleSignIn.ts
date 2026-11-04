'use client';
import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { saveToken } from '@/actions/user';
import { completeUserData, createNewUser } from '@/app/sign-up/actions';
import { SignUpRefusedError } from '@/app/sign-up/signUpResult';
import { passkeyClient } from '@/config/turnkey';
import config from '@/config';
import { initOtpLogin, otpLogin } from '@/services/globalAccount';
import { getTurnkeyClient, getTurnkeyWalletAddress } from '@/services/turnkey';
import { getKernelAccount } from '@/services/zerodev';
import { writeSession } from '@/utils/globalAccountSession';
import { startConsoleSession } from '@/utils/consoleSession';
import { generateP256KeyPair } from '@turnkey/crypto';
import { isEmpty } from 'lodash';

// The steps of a console sign-in, shared by the sign-in page (AuthProvider)
// and the session-expired dialog (GlobalAccountProvider).

export const PASSKEY_SESSION_SECONDS = 30 * 60;
export const EMAIL_CODE_SESSION_SECONDS = 15 * 60;

export interface ConsoleAccount {
  email: string;
  subOrganizationId: string;
}

// A Turnkey session key: the bundle, the key it was encrypted to, how long it
// lasts and when the console treats it as expired.
export interface TurnkeyCredential {
  credentialBundle: string;
  privateKey: string;
  sessionSeconds: number;
  expiry: number;
}

const nowInSeconds = () => Math.ceil(Date.now() / 1000);

// The browser's passkey prompt. Counted from before the prompt, so the console
// never thinks the key lives longer than it does.
export const passkeyCredential = async (
  subOrganizationId: string,
): Promise<TurnkeyCredential | null> => {
  const key = generateP256KeyPair();
  const expiry = nowInSeconds() + PASSKEY_SESSION_SECONDS;
  // A window in seconds, not a point in time: the key lasts as long as the
  // console session.
  const { credentialBundle } = await passkeyClient.createReadWriteSession({
    organizationId: subOrganizationId,
    targetPublicKey: key.publicKeyUncompressed,
    expirationSeconds: String(PASSKEY_SESSION_SECONDS),
  });
  if (isEmpty(credentialBundle)) return null;
  return {
    credentialBundle,
    privateKey: key.privateKey,
    sessionSeconds: PASSKEY_SESSION_SECONDS,
    expiry,
  };
};

// Emails a 6-digit code; the id goes back with the code.
export const sendEmailCode = async (email: string): Promise<string> => {
  const { otpId } = await initOtpLogin(email);
  return otpId;
};

export const emailCodeCredential = async ({
  email,
  otpId,
  otp,
}: {
  email: string;
  otpId: string;
  otp: string;
}): Promise<TurnkeyCredential | null> => {
  const key = generateP256KeyPair();
  const { credentialBundle } = await otpLogin({
    email,
    otpId,
    otpCode: otp,
    key: key.publicKeyUncompressed,
  });
  if (isEmpty(credentialBundle)) return null;
  return {
    credentialBundle,
    privateKey: key.privateKey,
    sessionSeconds: EMAIL_CODE_SESSION_SECONDS,
    expiry: nowInSeconds() + EMAIL_CODE_SESSION_SECONDS,
  };
};

// Signs DIMO's challenge with the account's smart wallet for a DIMO token, and
// creates or completes the console account when it needs it.
export const signIntoDimo = async ({
  account,
  credential,
  existsOnDevConsole,
  currentWalletValue,
}: {
  account: ConsoleAccount;
  credential: Pick<TurnkeyCredential, 'credentialBundle' | 'privateKey'>;
  existsOnDevConsole: boolean;
  currentWalletValue?: `0x${string}` | null;
}) => {
  const { subOrganizationId, email } = account;
  const client = getTurnkeyClient({
    authKey: credential.credentialBundle,
    eKey: credential.privateKey,
  });
  const walletAddress = await getTurnkeyWalletAddress({
    subOrganizationId: subOrganizationId,
    client: client,
  });

  const kernelAccount = await getKernelAccount({
    subOrganizationId: subOrganizationId,
    walletAddress: walletAddress,
    client: client,
  });

  const { challenge, state } = await getDimoChallenge({
    address: kernelAccount.address,
    domain: `${config.frontendUrl}sign-in`,
    clientId: 'developer-platform',
  });

  const signedChallenge = await kernelAccount.signMessage({
    message: challenge,
  });

  const token = await getDimoToken({
    state: state,
    signedChallenge: signedChallenge,
    clientId: 'developer-platform',
    domain: `${config.frontendUrl}sign-in`,
  });

  if (isEmpty(token)) {
    throw new Error('Could not login to Dimo');
  }

  if (!existsOnDevConsole) {
    const created = await createNewUser(
      {
        name: email,
        email: email,
        address: kernelAccount.address,
        auth: 'credentials',
        auth_login: email,
      },
      token.access_token,
    );
    if (!created.ok) throw new SignUpRefusedError(created.reason);
  }

  if (existsOnDevConsole && currentWalletValue !== kernelAccount.address) {
    const completed = await completeUserData(
      {
        email: email,
        address: kernelAccount.address,
      },
      token.access_token,
    );
    if (!completed.ok) throw new SignUpRefusedError(completed.reason);
  }

  return { token, newWalletAddress: kernelAccount.address };
};

// The server cookie, then the one session every tab shares (they hear of it).
// `beforeWrite` runs between the two, for the sign-in page's cache reset.
export const storeConsoleSession = async ({
  account,
  credential,
  accessToken,
  beforeWrite,
}: {
  account: ConsoleAccount;
  credential: TurnkeyCredential;
  accessToken: string;
  beforeWrite?: () => void;
}) => {
  await saveToken(accessToken, credential.sessionSeconds);
  beforeWrite?.();
  startConsoleSession(account.subOrganizationId);
  writeSession({
    email: account.email,
    role: 'owner',
    subOrganizationId: account.subOrganizationId,
    token: credential.credentialBundle,
    expiry: credential.expiry,
    eKey: credential.privateKey,
  });
};

// Starts a new session for an account whose session expired, without leaving
// the page: the same steps as a sign-in, for the same account.
export const renewConsoleSession = async ({
  account,
  credential,
  currentWalletValue,
}: {
  account: ConsoleAccount;
  credential: TurnkeyCredential;
  currentWalletValue: `0x${string}` | null;
}) => {
  const { token } = await signIntoDimo({
    account,
    credential,
    existsOnDevConsole: true,
    currentWalletValue,
  });
  await storeConsoleSession({ account, credential, accessToken: token.access_token });
};
