import React from 'react';
import { render } from '@testing-library/react';
import { BrandLockup } from '@/components/BrandLockup';

// jsdom has no layout: stub the lockup's box and content widths.
const stubWidths = (client: number, scroll: number) => {
  for (const [prop, value] of [
    ['clientWidth', client],
    ['scrollWidth', scroll],
  ] as const) {
    jest.spyOn(Element.prototype, prop, 'get').mockImplementation(function (
      this: Element,
    ) {
      return this.classList.contains('brand-lockup') ? value : 0;
    });
  }
};

describe('BrandLockup', () => {
  afterEach(() => jest.restoreAllMocks());

  it('scales the whole lockup down when the name overflows its box, never wrapping it', () => {
    // A 16px browser minimum font makes the 220px sidebar lockup need 245px.
    stubWidths(220, 245);
    const { container } = render(<BrandLockup product="Developer Console" />);
    const lockup = container.querySelector('.brand-lockup') as HTMLElement;
    expect(lockup.style.transform).toBe(`scale(${220 / 245})`);
  });

  it('leaves a lockup that fits at full size', () => {
    stubWidths(220, 209);
    const { container } = render(<BrandLockup product="Developer Console" />);
    expect(
      (container.querySelector('.brand-lockup') as HTMLElement).style.transform,
    ).toBe('');
  });
});
