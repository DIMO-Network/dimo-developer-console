import React, {
  type ReactNode,
  type FC,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from 'react';
import { Button as ShadcnButton } from '@/components/ui/button';
import { BubbleLoader } from '@/components/BubbleLoader';
import { cn } from '@/lib/utils';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  className,
  loading = false,
  onClick = () => {},
  disabled,
  ...props
}) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!loading) onClick(e);
  };

  return (
    <ShadcnButton
      {...props}
      variant="default"
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn('button', className)}
    >
      {loading ? (
        <BubbleLoader isSmall isLoading />
      ) : (
        <span className="content">{children}</span>
      )}
    </ShadcnButton>
  );
};

export default Button;
