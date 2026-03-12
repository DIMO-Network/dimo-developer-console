import { TextareaHTMLAttributes, forwardRef, ReactNode } from 'react';

import classnames from 'classnames';

import './TextArea.css';

interface IProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  action?: ReactNode;
}

export type Ref = HTMLTextAreaElement;

export const TextArea = forwardRef<Ref, IProps>(
  ({ className: inputClassName = '', action, ...props }, ref) => {
    const className = classnames(inputClassName);
    return (
      <div className="text-area">
        <textarea className={className} {...props} ref={ref} />
        {action}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';

export default TextArea;
