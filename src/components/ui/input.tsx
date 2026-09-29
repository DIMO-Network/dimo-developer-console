import * as React from 'react';

import { cn } from '@/lib/utils';

// Fleet control. Font size is arbitrary on purpose: twMerge reads the custom
// `text-body-sm` token as a color and would drop `text-fg`.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex min-h-10 w-full rounded-control border border-control-border bg-control px-3 py-2 text-[14px] leading-5 text-fg transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg placeholder:text-muted hover:border-control-border-hover focus-visible:border-focus-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50 read-only:cursor-default read-only:text-muted',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
