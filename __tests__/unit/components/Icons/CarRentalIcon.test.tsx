import { render, screen } from '@testing-library/react';
import { CarRentalIcon } from '@/components/Icons';

describe('CarRentalIcon', () => {
  it('renders a Car rental icon', () => {
    render(<CarRentalIcon className="w-5 h-6" />);

    const carRentalIcon = screen.getByRole('car-rental-icon');

    expect(carRentalIcon).toBeInTheDocument();
  });
});
