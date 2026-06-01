import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import './TextField.css';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  action?: ReactNode;
}

export type Ref = HTMLInputElement;

export const TextField = forwardRef<Ref, IProps>(
  ({ className = '', action, ...props }, ref) => {
    return (
      <div className="text-field">
        <Input className={className} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
export default TextField;
