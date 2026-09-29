import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import './TextArea.css';

interface IProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  action?: ReactNode;
}

// The wrapper owns the single edge and focus ring; the primitive goes bare.
const BARE =
  'rounded-none border-0 bg-transparent p-0 hover:border-0 focus-visible:border-0 focus-visible:ring-0';

export type Ref = HTMLTextAreaElement;

export const TextArea = forwardRef<Ref, IProps>(
  ({ className = '', action, ...props }, ref) => {
    return (
      <div className="text-area">
        <Textarea className={cn(BARE, className)} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
export default TextArea;
