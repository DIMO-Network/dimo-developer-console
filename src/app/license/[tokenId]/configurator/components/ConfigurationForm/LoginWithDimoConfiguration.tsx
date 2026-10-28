import { FC } from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import {
  BrandSelect,
  LegalLinksCard,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/SharedFields';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

export const LoginWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => (
  <>
    {brandNames.length > 1 && (
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <h3 className="text-card-title text-ink">Login settings</h3>
        <BrandSelect register={register} control={control} brandNames={brandNames} />
      </div>
    )}
    <LegalLinksCard register={register} shownTo="users before they log in" />
  </>
);
