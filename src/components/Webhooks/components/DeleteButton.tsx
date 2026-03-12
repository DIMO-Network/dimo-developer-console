import React from 'react';
import Button from '@/components/Button/Button';

export const DeleteButton = ({ onDelete }: { onDelete: () => void }) => {
  return (
    <Button className="primary-outline" onClick={onDelete}>
      Delete
    </Button>
  );
};
