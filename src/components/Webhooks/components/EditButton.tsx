import Link from 'next/link';
import Button from '@/components/Button/Button';
import React from 'react';

export const EditButton = ({ editUrl }: { editUrl: string }) => {
  return (
    <Link href={editUrl}>
      <Button className="primary-outline">Edit</Button>
    </Link>
  );
};
