import { InputHTMLAttributes, forwardRef } from 'react';

import classnames from 'classnames';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const defaultClassNames = [
  'rounded-lg',
  'py-2',
  'px-4',
  'outline-0',
  'bg-gray-950',
  'text-gray-50',
];

export type Ref = HTMLInputElement;

export const TextField = forwardRef<Ref, IProps>(
  ({ className: inputClassName, ...props }, ref) => {
    const className = classnames(...defaultClassNames, inputClassName);
    return <input className={className} {...props} ref={ref} />;
  }
);

TextField.displayName = 'TextField';

TextField.defaultProps = {
  className: '',
};

export default TextField;
