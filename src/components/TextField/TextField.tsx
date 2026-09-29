import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import './TextField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  wrapperClassName?: string;
  action?: ReactNode;
}

// The wrapper owns the single edge and focus ring; the primitive goes bare.
const BARE =
  'min-h-0 rounded-none border-0 bg-transparent p-0 hover:border-0 focus-visible:border-0 focus-visible:ring-0';

export type Ref = HTMLInputElement;

export const TextField = forwardRef<Ref, IProps>(
  ({ className = '', wrapperClassName = '', action, ...props }, ref) => {
    return (
      <div className={`text-field${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
        <Input className={cn(BARE, className)} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
export default TextField;
