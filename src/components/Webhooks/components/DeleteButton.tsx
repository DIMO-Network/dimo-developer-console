import React from 'react';
import Button from '@/components/Button/Button';

export const DeleteButton = ({ onDelete }: { onDelete: () => void }) => {
  return (
    <Button variant="secondary" onClick={onDelete}>
      Delete
    </Button>
  );
};
