import React from 'react';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';

const EmptyList: React.FC = () => {
  return (
    <div className={'flex flex-col flex-1 w-full items-center justify-center'}>
      <p className={'font-black text-base text-white mb-1.5'}>
        You haven&#39;t created any developer licenses yet
      </p>
      <p className={'font-normal text-text-secondary text-sm mb-2.5'}>
        Use your Developer License credentials to integrate with DIMO
      </p>
      <CreateAppButton />
    </div>
  );
};
export default EmptyList;
