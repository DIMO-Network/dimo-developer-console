import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrandForm } from '@/app/license/[tokenId]/details/components/Brand/components/BrandForm';
import type { BrandView } from '@/services/brand';

jest.mock('@/actions/brand', () => ({
  createMyBrand: jest.fn().mockResolvedValue({
    id: 'new-1',
    name: 'New Brand',
    logoCid: null,
    iconCid: null,
    logoUrl: null,
    iconUrl: null,
    primaryColor: null,
    isDefault: false,
    updatedAt: null,
  }),
  updateMyBrandById: jest.fn().mockResolvedValue({
    id: 'b1',
    name: 'Fleet App',
    logoCid: null,
    iconCid: null,
    logoUrl: null,
    iconUrl: null,
    primaryColor: null,
    isDefault: true,
    updatedAt: null,
  }),
  setDefaultBrand: jest.fn().mockResolvedValue({}),
  uploadMyBrandAsset: jest.fn(),
}));

const existingBrand: BrandView = {
  id: 'b1',
  name: 'Fleet App',
  logoCid: null,
  iconCid: null,
  logoUrl: null,
  iconUrl: null,
  primaryColor: null,
  isDefault: true,
  updatedAt: null,
};

const nonDefaultBrand: BrandView = {
  ...existingBrand,
  id: 'b2',
  name: 'Consumer App',
  isDefault: false,
};

describe('BrandForm', () => {
  it('renders the name field pre-filled for an existing brand', () => {
    render(
      <BrandForm
        brand={existingBrand}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    expect(screen.getByDisplayValue('Fleet App')).toBeInTheDocument();
  });

  it('renders an empty name field when creating a new brand', () => {
    render(
      <BrandForm
        brand={null}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('e.g. Fleet App')).toHaveValue('');
  });

  it('shows rename warning when name is changed on an existing brand', async () => {
    render(
      <BrandForm
        brand={existingBrand}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('Fleet App'), {
      target: { value: 'Fleet App 2' },
    });
    await waitFor(() => {
      expect(
        screen.getByText(/Renaming breaks existing Login with DIMO calls/),
      ).toBeInTheDocument();
    });
  });

  it('does not show rename warning when creating a new brand', () => {
    render(
      <BrandForm
        brand={null}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('e.g. Fleet App'), {
      target: { value: 'New Name' },
    });
    expect(screen.queryByText(/Renaming breaks/)).not.toBeInTheDocument();
  });

  it('shows Set as Default button for a non-default brand', () => {
    render(
      <BrandForm
        brand={nonDefaultBrand}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    expect(screen.getByText('Set as Default')).toBeInTheDocument();
  });

  it('does not show Set as Default button for the default brand', () => {
    render(
      <BrandForm
        brand={existingBrand}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    expect(screen.queryByText('Set as Default')).not.toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(
      <BrandForm
        brand={existingBrand}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={onCancel}
        onSetDefault={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
