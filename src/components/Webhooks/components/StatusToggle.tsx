import React from 'react';
import { Toggle } from '@/components/Toggle';

export const StatusToggle = ({
  isActive,
  onToggleStatus,
}: {
  isActive: boolean;
  onToggleStatus: () => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Status</span>
      <Toggle checked={isActive} onToggle={onToggleStatus} />
    </div>
  );
};
