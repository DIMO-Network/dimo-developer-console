import { forwardRef, type InputHTMLAttributes, type FC } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type Ref = HTMLButtonElement;

export const CheckboxField: FC<InputHTMLAttributes<HTMLInputElement>> = forwardRef<
  Ref,
  InputHTMLAttributes<HTMLInputElement>
>(({ className = '', onChange, checked, defaultChecked, disabled, id }, ref) => {
  return (
    <Checkbox
      ref={ref}
      id={id}
      checked={checked as boolean | undefined}
      defaultChecked={defaultChecked as boolean | undefined}
      disabled={disabled}
      onCheckedChange={(val) => {
        if (onChange) {
          const event = {
            target: { checked: val === true },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(event);
        }
      }}
      className={cn('checkbox', className)}
    />
  );
});

CheckboxField.displayName = 'CheckboxField';
