import { Section, SectionHeader } from '@/components/Section';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';

export const View = () => {
  return (
    <div>
      <Section>
        <SectionHeader title={'Vehicle Details'} />
        <VehicleDetailsTable />
      </Section>
    </div>
  );
};
