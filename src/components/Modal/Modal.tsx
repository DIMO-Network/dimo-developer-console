'use client';

import { type FC, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import './Modal.css';

interface IProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
  className?: string;
  showClose?: boolean;
  children: ReactNode;
}

export const Modal: FC<IProps> = ({
  children,
  isOpen,
  setIsOpen,
  className,
  showClose = true,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={cn('dialog-panel', className)}>
        <DialogTitle className="sr-only">Dialog</DialogTitle>
        {showClose && (
          <div className="dialog-close-content">
            <button
              type="button"
              className="close-btn"
              onClick={() => setIsOpen(false)}
              role="close-modal"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="dialog-content">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
