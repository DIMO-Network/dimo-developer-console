import React from 'react';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';

const EmptyList: React.FC = () => {
  return (
    <div
      className={
        'flex w-full flex-1 flex-col items-center justify-center rounded-card bg-card p-10 text-center'
      }
    >
      <p className={'text-card-title text-ink'}>
        You haven&#39;t created any developer licenses yet
      </p>
      <p className={'mb-5 mt-1 text-body-sm text-muted'}>
        Use your developer license credentials to integrate with DIMO
      </p>
      <CreateAppButton />
    </div>
  );
};
export default EmptyList;
