import { Section, SectionHeader } from '@/components/Section';
import { VehicleDetailsTable } from '@/app/license/details/[tokenId]/vehicles/components/VehicleDetailsTable';

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
