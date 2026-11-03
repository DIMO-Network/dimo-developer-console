import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const getGlobalAccountDeveloperJwt = jest.fn();
const publishEvent = jest.fn();
jest.mock('@/hooks', () => ({
  useDimoAuth: () => ({ getGlobalAccountDeveloperJwt }),
  useEventEmitter: () => ({ publishEvent }),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';
import { saveDevJwt } from '@/utils/devJwt';
import { ConsoleAccess } from '@/app/license/[tokenId]/details/components/Signers/ConsoleAccess';

const CLIENT_ID = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f' as const;
const jwt = (exp: number) =>
  `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;
const FUTURE = jwt(Math.floor(Date.now() / 1000) + 3600);
const PAST = jwt(Math.floor(Date.now() / 1000) - 3600);
const DOMAIN = 'https://a.test';
const writeText = jest.fn(async () => {});

const show = (domain: string | undefined = DOMAIN) =>
  render(
    <ConsoleAccess
      isLicenseOwner
      on
      enabling={false}
      error={null}
      onEnable={jest.fn()}
      clientId={CLIENT_ID}
      domain={domain}
    />,
  );

describe('ConsoleAccess Copy JWT', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("copies the license's stored JWT", async () => {
    saveDevJwt(CLIENT_ID, FUTURE);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Copy JWT' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(FUTURE));
    expect(getGlobalAccountDeveloperJwt).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('JWT copied!');
    expect(publishEvent).toHaveBeenCalledWith({}, true);
  });

  it('makes a JWT to copy when none is stored', async () => {
    getGlobalAccountDeveloperJwt.mockImplementation(async () => {
      saveDevJwt(CLIENT_ID, FUTURE);
      return true;
    });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Copy JWT' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(FUTURE));
    expect(getGlobalAccountDeveloperJwt).toHaveBeenCalledTimes(1);
    expect(getGlobalAccountDeveloperJwt).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      domain: 'https://a.test',
    });
  });

  it('skips an expired JWT', async () => {
    saveDevJwt(CLIENT_ID, PAST);
    getGlobalAccountDeveloperJwt.mockImplementation(async () => {
      saveDevJwt(CLIENT_ID, FUTURE);
      return true;
    });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Copy JWT' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(FUTURE));
    expect(writeText).not.toHaveBeenCalledWith(PAST);
  });

  it("can't copy without a redirect URI", () => {
    render(
      <ConsoleAccess
        isLicenseOwner
        on
        enabling={false}
        error={null}
        onEnable={jest.fn()}
        clientId={CLIENT_ID}
        domain={undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Copy JWT' })).toBeDisabled();
    expect(
      screen.getByText('Add a redirect URI below to make developer JWTs.'),
    ).toBeInTheDocument();
  });

  it('says so when no JWT can be made', async () => {
    getGlobalAccountDeveloperJwt.mockResolvedValue(false);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Copy JWT' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't make a JWT. Try again."),
    );
    expect(writeText).not.toHaveBeenCalled();
  });
});
