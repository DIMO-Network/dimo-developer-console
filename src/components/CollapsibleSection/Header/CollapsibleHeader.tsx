import React, { FC, PropsWithChildren } from 'react';
import { Title } from '@/components/Title';
import { useCollapsible } from '@/components/CollapsibleSection/CollapsibleContext';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';

interface IProps {
  title?: string;
}

export const CollapsibleHeader: FC<PropsWithChildren<IProps>> = ({ children, title }) => {
  const { isOpen, toggle } = useCollapsible();
  return (
    <div
      onClick={toggle}
      className={
        'flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center'
      }
    >
      {!!title && (
        <Title component="h2" className={'text-xl'}>
          {title}
        </Title>
      )}
      <div className={'w-fit flex flex-row gap-2 items-center'}>
        {children}
        {isOpen ? (
          <ChevronUpIcon className={'h-6 w-6'} />
        ) : (
          <ChevronDownIcon className={'h-6 w-6'} />
        )}
      </div>
    </div>
  );
};
