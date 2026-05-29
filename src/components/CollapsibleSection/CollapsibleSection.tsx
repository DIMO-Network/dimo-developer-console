import React, { FC, PropsWithChildren, useState } from 'react';
import { CollapsibleHeader } from './Header';
import { CollapsibleContent } from './Content';
import { CollapsibleContext } from './CollapsibleContext';

interface ITitleProps {
  title?: string;
}

type CollapsibleSectionType = FC<PropsWithChildren> & {
  Title: FC<PropsWithChildren<ITitleProps>>;
  Content: FC<PropsWithChildren>;
};

const CollapsibleSection: CollapsibleSectionType = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className="p-4 bg-accent rounded-2xl flex flex-col gap-4 justify-between">
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
};

CollapsibleSection.Title = CollapsibleHeader;
CollapsibleSection.Content = CollapsibleContent;
export { CollapsibleSection };
