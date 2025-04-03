import React, { FC, PropsWithChildren } from 'react';
import { Title } from '@/components/Title';

interface IProps {
  title?: string;
}
export const SectionHeader: FC<PropsWithChildren<IProps>> = ({ children, title }) => {
  return (
    <div
      className={
        'flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center'
      }
    >
      {!!title && (
        <Title component="h2" className={'text-xl'}>
          {title}
        </Title>
      )}
      {children}
    </div>
  );
};
