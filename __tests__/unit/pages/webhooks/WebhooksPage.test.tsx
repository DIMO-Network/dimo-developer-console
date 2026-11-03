import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/hooks/useGetDevJwts', () => ({ useGetDevJwts: jest.fn() }));
jest.mock('@/components/Webhooks/components/DeveloperLicenseSelector', () => ({
  DevLicenseSelector: () => <div data-testid="license-selector" />,
}));
jest.mock('@/components/Webhooks/components/WebhooksTableSection', () => ({
  WebhooksTableSection: () => null,
}));
jest.mock('@/components/Webhooks/components/GenerateDevJWTSection', () => ({
  GenerateDevJWTSection: () => null,
}));

import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { WebhooksPage } from '@/app/webhooks/webhooksPage/View';

const licenses = (over: object) =>
  (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
    developerLicenses: [],
    hasLicenseWithoutRedirectUri: false,
    loading: false,
    error: undefined,
    ...over,
  });

describe('WebhooksPage', () => {
  beforeEach(() => {
    (useGetDevJwts as jest.Mock).mockReturnValue({
      refetch: jest.fn(),
      isAuthenticatedAsDev: false,
    });
  });

  it('asks for a redirect URI when no license has one yet, instead of an empty selector', () => {
    licenses({ hasLicenseWithoutRedirectUri: true });
    render(<WebhooksPage />);
    expect(
      screen.getByText('Add a redirect URI to your license to set up webhooks.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to licenses' })).toHaveAttribute(
      'href',
      '/licenses',
    );
    expect(screen.queryByTestId('license-selector')).not.toBeInTheDocument();
  });

  it('asks for a license when the team has none', () => {
    licenses({});
    render(<WebhooksPage />);
    expect(
      screen.getByText('Create a developer license to set up webhooks.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('license-selector')).not.toBeInTheDocument();
  });

  it('shows the license selector once a license is usable', () => {
    licenses({
      developerLicenses: [{ clientId: '0xabc', firstRedirectURI: 'https://x.test' }],
    });
    render(<WebhooksPage />);
    expect(screen.getByTestId('license-selector')).toBeInTheDocument();
  });
});
