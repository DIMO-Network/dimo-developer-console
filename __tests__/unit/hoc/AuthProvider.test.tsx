import { render, screen, waitFor } from '@testing-library/react';
import { useContext, useEffect, useState } from 'react';
import { installFakeBroadcastChannel } from '@/utils/__fixtures__/fakeBroadcastChannel';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/hooks', () => ({ useMixPanel: () => ({ trackEvent: jest.fn() }) }));
jest.mock('@/actions/user', () => ({
  saveToken: jest.fn(async () => undefined),
  endSession: jest.fn(async () => true),
}));
jest.mock('@/config/turnkey', () => ({
  turnkeyClient: { logout: jest.fn(async () => undefined) },
  passkeyClient: {},
}));
jest.mock('@/services/globalAccount', () => ({
  initOtpLogin: jest.fn(),
  otpLogin: jest.fn(async () => ({ credentialBundle: 'bundle-1' })),
}));
jest.mock('@turnkey/crypto', () => ({
  generateP256KeyPair: jest.fn(() => ({
    privateKey: 'key-1',
    publicKeyUncompressed: 'pub-1',
  })),
  decryptCredentialBundle: jest.fn(),
}));
jest.mock('@/actions/dimoAuth', () => ({
  exchangeDimoToken: jest.fn(),
  getDimoChallenge: jest.fn(async () => ({ challenge: 'challenge', state: 'state' })),
  getDimoToken: jest.fn(async () => ({ access_token: 't' })),
}));
jest.mock('@/services/turnkey', () => ({
  getTurnkeyClient: jest.fn(() => ({})),
  getTurnkeyWalletAddress: jest.fn(
    async () => '0x00000000000000000000000000000000000000aa',
  ),
}));
jest.mock('@/services/zerodev', () => ({
  getKernelAccount: jest.fn(async () => ({
    address: '0x00000000000000000000000000000000000000bb',
    signMessage: jest.fn(async () => '0xsigned'),
  })),
}));
jest.mock('@/app/sign-up/actions', () => ({
  createNewUser: jest.fn(),
  completeUserData: jest.fn(),
}));
jest.mock('@/utils/middlewareUtils', () => ({ decodeJwtToken: jest.fn() }));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
jest.mock('@/hoc/QueryProvider', () => ({ queryClient: { clear: jest.fn() } }));

import { endSession } from '@/actions/user';
import { createNewUser, completeUserData } from '@/app/sign-up/actions';
import { AuthContext } from '@/context/AuthContext';
import { withAuth } from '@/hoc/AuthProvider';
import { readSession, SESSION_KEY } from '@/utils/globalAccountSession';

const KERNEL = '0x00000000000000000000000000000000000000bb';
const nowS = () => Math.floor(Date.now() / 1000);

const SignIn = () => {
  const { setUser, completeOtpLogin } = useContext(AuthContext);
  const [step, setStep] = useState<'start' | 'user set' | 'signed in'>('start');
  useEffect(() => {
    if (step === 'start') {
      setUser({ email: 'a@b.co', subOrganizationId: 'sub-1' });
      setStep('user set');
    } else if (step === 'user set') {
      void completeOtpLogin({
        otp: '123456',
        otpId: 'otp-1',
        existOnDevConsole: true,
        currentWalletValue: KERNEL,
      }).then(({ success }) => success && setStep('signed in'));
    }
  }, [step]);
  return <p>{step}</p>;
};
const SignInPage = withAuth(SignIn);
const IdlePage = withAuth(() => <p>sign in</p>);

const store = (over = {}) =>
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      email: 'a@b.co',
      role: 'owner',
      subOrganizationId: 'sub-1',
      token: 'bundle-0',
      eKey: 'key-0',
      expiry: nowS() + 600,
      ...over,
    }),
  );

describe('withAuth and the shared session', () => {
  let fake: ReturnType<typeof installFakeBroadcastChannel>;
  let other: ReturnType<ReturnType<typeof installFakeBroadcastChannel>['otherTab']>;

  // One channel per tab lives in the store module for the whole file.
  beforeAll(() => {
    fake = installFakeBroadcastChannel();
  });
  afterAll(() => fake.restore());
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    other = fake.otherTab();
  });
  afterEach(() => other.close());

  it('a sign-in stores one session for every tab, with its key, and tells them', async () => {
    render(<SignInPage />);
    expect(await screen.findByText('signed in')).toBeInTheDocument();
    const session = readSession();
    expect(session).toMatchObject({
      email: 'a@b.co',
      role: 'owner',
      subOrganizationId: 'sub-1',
      token: 'bundle-1',
      eKey: 'key-1',
    });
    expect(sessionStorage.getItem('globalAccount')).toBeNull();
    expect(localStorage.getItem('GlobalAccountEmbeddedKey')).toBeNull();
    await waitFor(() =>
      expect(other.received).toContainEqual({
        from: expect.any(String),
        event: { type: 'signed-in', subOrganizationId: 'sub-1', expiry: session!.expiry },
      }),
    );
    expect(createNewUser).not.toHaveBeenCalled();
    expect(completeUserData).not.toHaveBeenCalled();
  });

  it('sends a visitor with a live shared session from the sign-in page to /app', async () => {
    store();
    render(<IdlePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/app'));
    expect(endSession).not.toHaveBeenCalled();
  });

  it('clears an expired shared session on the sign-in page and tells the other tabs', async () => {
    store({ expiry: nowS() - 5 });
    render(<IdlePage />);
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toBeNull());
    await waitFor(() =>
      expect(other.received).toContainEqual({
        from: expect.any(String),
        event: { type: 'signed-out' },
      }),
    );
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalledWith('/app');
  });

  // The proxy answers endSession with a 401 once the session cookie is gone.
  it('clears an expired shared session even when the server refuses endSession', async () => {
    (endSession as jest.Mock).mockRejectedValueOnce(new Error('unexpected response'));
    store({ expiry: nowS() - 5 });
    render(<IdlePage />);
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toBeNull());
    expect(replace).not.toHaveBeenCalledWith('/app');
  });
});
