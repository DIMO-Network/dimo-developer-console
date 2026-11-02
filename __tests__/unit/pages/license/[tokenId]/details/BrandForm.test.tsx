import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrandForm } from '@/app/license/[tokenId]/details/components/Brand/components/BrandForm';
import type { BrandView } from '@/services/brand';

jest.mock('@/actions/brand', () => ({
  createMyBrand: jest.fn(),
  updateMyBrandById: jest.fn(),
  setDefaultBrand: jest.fn().mockResolvedValue({}),
  uploadMyBrandAsset: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { createMyBrand, updateMyBrandById, uploadMyBrandAsset } from '@/actions/brand';

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

const savedBrand: BrandView = { ...existingBrand, id: 'new-1', name: 'New Brand' };
const refusedAs = (status: number, code: string | null = null) => ({
  ok: false,
  status,
  code,
  message: 'Refused',
});

const newBrandForm = () => {
  const onSave = jest.fn();
  const view = render(
    <BrandForm
      brand={null}
      workspaceId="ws-1"
      isOwner={true}
      onSave={onSave}
      onCancel={jest.fn()}
      onSetDefault={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByPlaceholderText('e.g. Fleet App'), {
    target: { value: 'New Brand' },
  });
  return { onSave, ...view };
};
const pickImage = (container: HTMLElement) => {
  const logo = new File(['png'], 'logo.png', { type: 'image/png' });
  fireEvent.change(container.querySelector('input[type="file"]')!, {
    target: { files: [logo] },
  });
};
const saveButton = () => screen.getByRole('button', { name: 'Save brand' });
const save = async () => {
  await waitFor(() => expect(saveButton()).toBeEnabled());
  fireEvent.click(saveButton());
};

describe('saving a brand', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:picked');
    global.URL.revokeObjectURL = jest.fn();
    (createMyBrand as jest.Mock).mockResolvedValue({ ok: true, data: savedBrand });
    (updateMyBrandById as jest.Mock).mockResolvedValue({
      ok: true,
      data: existingBrand,
    });
  });

  it('hands the saved brand back', async () => {
    const { onSave } = newBrandForm();
    await save();
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(savedBrand));
    expect(toast.success).toHaveBeenCalledWith('Brand saved');
  });

  it('points at the name when the license already has a brand called that', async () => {
    (createMyBrand as jest.Mock).mockResolvedValue(refusedAs(409, 'BRAND_NAME_TAKEN'));
    const { onSave } = newBrandForm();
    await save();
    expect(
      await screen.findByText('A brand with this name already exists'),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('says why an image was refused and saves nothing', async () => {
    (uploadMyBrandAsset as jest.Mock).mockResolvedValue(refusedAs(400));
    const { onSave, container } = newBrandForm();
    pickImage(container);
    await save();
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('PNG, JPEG, WebP, or SVG'),
      ),
    );
    expect(createMyBrand).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the uploaded image on the brand', async () => {
    (uploadMyBrandAsset as jest.Mock).mockResolvedValue({
      ok: true,
      data: { cid: 'QmLogo', gatewayUrl: 'https://assets.dimo.org/ipfs/QmLogo' },
    });
    const { container } = newBrandForm();
    pickImage(container);
    await save();
    await waitFor(() =>
      expect(createMyBrand).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ logoCid: 'QmLogo' }),
      ),
    );
  });

  it('reports a failure it cannot explain, and keeps it in Sentry', async () => {
    (createMyBrand as jest.Mock).mockResolvedValue(refusedAs(500));
    const { onSave } = newBrandForm();
    await save();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save brand'));
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('survives a Server Action that never answers', async () => {
    (createMyBrand as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    newBrandForm();
    await save();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save brand'));
  });

  // The picker showed the saved image from brand.logoUrl whatever Remove did, and
  // Save stayed disabled because nothing counted as a change.
  it('removes a saved image', async () => {
    const withLogo = {
      ...existingBrand,
      logoCid: 'QmLogo',
      logoUrl: 'https://assets.dimo.org/ipfs/QmLogo',
    };
    render(
      <BrandForm
        brand={withLogo}
        workspaceId="ws-1"
        isOwner={true}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        onSetDefault={jest.fn()}
      />,
    );
    expect(screen.getByAltText('brand preview')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    fireEvent.click(screen.getByText('Remove'));

    expect(screen.queryByAltText('brand preview')).not.toBeInTheDocument();
    await save();
    await waitFor(() =>
      expect(updateMyBrandById).toHaveBeenCalledWith(
        'ws-1',
        'b1',
        expect.objectContaining({ logoCid: null }),
      ),
    );
  });
});

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

  it('shows Set as default button for a non-default brand', () => {
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
    expect(screen.getByText('Set as default')).toBeInTheDocument();
  });

  it('does not show Set as default button for the default brand', () => {
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
    expect(screen.queryByText('Set as default')).not.toBeInTheDocument();
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

  it('warns, without blocking, when the color is hard to see in the sign-in window', async () => {
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
    const color = screen.getByPlaceholderText('#C8A84B');
    fireEvent.change(color, { target: { value: '#FFE066' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/hard to see .* light mode/),
    );
    expect(screen.getByText('Save brand')).not.toBeDisabled();

    fireEvent.change(color, { target: { value: '#000000' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/dark mode/),
    );

    fireEvent.change(color, { target: { value: '#3366CC' } });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });
});
