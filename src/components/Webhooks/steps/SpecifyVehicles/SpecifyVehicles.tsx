import { Toggle } from '@/components/Toggle';
import { useFormContext, Controller } from 'react-hook-form';
import { Title } from '@/components/Title';

// TODO - if we toggle this off, how do we handle the field validation?
export const WebhookSpecifyVehiclesStep = () => {
  const { control } = useFormContext();
  return (
    <Controller
      name="includeAllVehicles"
      control={control}
      defaultValue={true}
      render={({ field }) => (
        <>
          <Title className={'text-xl font-black'}>Who do you want to subscribe?</Title>
          <div className={'flex flex-row gap-2.5 items-center'}>
            <Toggle checked={field.value} onToggle={field.onChange} />
            <p className={'text-sm'}>Subscribe all new and existing vehicles</p>
          </div>
        </>
      )}
    />
  );
};
