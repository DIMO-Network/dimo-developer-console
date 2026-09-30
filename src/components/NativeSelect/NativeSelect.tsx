'use client';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import classNames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

// A real <select> (keyboard, screen readers and the OS picker for free) drawn
// as a Fleet control: control fill and edge, hover firming, one focus ring on
// the element itself, and a chevron in place of the native arrow. The font
// size is arbitrary like ui/input.tsx, so it never fights a text-* colour.
export const NativeSelect = forwardRef<HTMLSelectElement, Props>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={classNames('relative', wrapperClassName)}>
      <select
        ref={ref}
        className={classNames(
          'h-10 w-full cursor-pointer appearance-none rounded-control border border-control-border bg-control pl-3 pr-9 text-[14px] leading-5 text-fg outline-none transition-[border-color,box-shadow] hover:border-control-border-hover focus:border-focus-ring focus:ring-[3px] focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  ),
);

NativeSelect.displayName = 'NativeSelect';
export default NativeSelect;
