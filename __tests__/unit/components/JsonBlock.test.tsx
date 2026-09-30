import React from 'react';
import { render, screen } from '@testing-library/react';
import { JsonBlock } from '@/components/JsonBlock';

describe('JsonBlock', () => {
  it('pretty-prints objects and offers copy', () => {
    render(<JsonBlock value={{ header: { type: 'dimo.status' }, data: null }} />);
    expect(screen.getByText(/"dimo.status"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
  it.each([['a plain string'], [null], [42]])('renders %p without crashing', (value) => {
    render(<JsonBlock value={value} />);
    expect(screen.getByTestId('json-block')).toBeInTheDocument();
  });
});
