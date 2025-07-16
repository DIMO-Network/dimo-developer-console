import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';

export const SimulatedVehiclesSection = () => {
  return (
    <div className="simulator-vehicles-section">
      <Card className="primary">
        <div className="flex flex-row items-center justify-between mb-6">
          <Title component="h2" className="text-xl font-semibold text-text-primary">
            Simulated Vehicles
          </Title>
          <Link href="/simulator/create">
            <Button className="dark with-icon">+ Create a simulated vehicle</Button>
          </Link>
        </div>

        <div className="empty-state">
          <p className="text-text-secondary text-center py-8">
            You haven&apos;t created any simulated vehicles yet.
          </p>
        </div>
      </Card>
    </div>
  );
};
