import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { Textarea } from '@/components/ui/textarea';
import './TextArea.css';

interface IProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  action?: ReactNode;
}

export type Ref = HTMLTextAreaElement;

export const TextArea = forwardRef<Ref, IProps>(
  ({ className = '', action, ...props }, ref) => {
    return (
      <div className="text-area">
        <Textarea className={className} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
export default TextArea;
