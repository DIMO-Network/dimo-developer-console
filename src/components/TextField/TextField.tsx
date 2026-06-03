import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import './TextField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  wrapperClassName?: string;
  action?: ReactNode;
}

export type Ref = HTMLInputElement;

export const TextField = forwardRef<Ref, IProps>(
  ({ className = '', wrapperClassName = '', action, ...props }, ref) => {
    return (
      <div className={`text-field${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
        <Input className={className} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
export default TextField;
