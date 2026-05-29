import { fireEvent, render, screen } from '@testing-library/react';
import { BrandRow } from '@/app/license/[tokenId]/details/components/Brand/components/BrandRow';
import type { BrandView } from '@/services/brand';

const baseBrand: BrandView = {
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

const nonDefault: BrandView = {
  ...baseBrand,
  id: 'b2',
  name: 'Consumer App',
  isDefault: false,
};

describe('BrandRow', () => {
  it('shows the brand name', () => {
    render(
      <BrandRow
        brand={baseBrand}
        isMultiple={false}
        isOwner={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Fleet App')).toBeInTheDocument();
  });

  it('shows Default badge when isDefault is true', () => {
    render(
      <BrandRow
        brand={baseBrand}
        isMultiple={false}
        isOwner={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('does not show Default badge when isDefault is false', () => {
    render(
      <BrandRow
        brand={nonDefault}
        isMultiple={true}
        isOwner={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText('Default')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(
      <BrandRow
        brand={nonDefault}
        isMultiple={true}
        isOwner={true}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTitle('Edit brand'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('disables delete when brand is default and multiple brands exist', () => {
    render(
      <BrandRow
        brand={baseBrand}
        isMultiple={true}
        isOwner={true}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByTitle('Set another brand as default before deleting this one'),
    ).toBeDisabled();
  });

  it('enables delete on default brand when it is the only brand', () => {
    const onDelete = jest.fn();
    render(
      <BrandRow
        brand={baseBrand}
        isMultiple={false}
        isOwner={true}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTitle('Delete brand'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete on a non-default brand', () => {
    const onDelete = jest.fn();
    render(
      <BrandRow
        brand={nonDefault}
        isMultiple={true}
        isOwner={true}
        onEdit={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTitle('Delete brand'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('hides action buttons when not owner', () => {
    render(
      <BrandRow
        brand={baseBrand}
        isMultiple={false}
        isOwner={false}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByTitle('Edit brand')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete brand')).not.toBeInTheDocument();
  });
});
