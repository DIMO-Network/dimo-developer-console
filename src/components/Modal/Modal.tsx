'use client';

import { type FC, Fragment, ReactNode } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

import './Modal.css';

interface IAction {
  render: FC;
  label: string;
  className: string;
}

interface IProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
  className: string;
  showClose?: boolean;
  actions?: IAction[];
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
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setIsOpen}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </TransitionChild>

        <div className={classNames('modal-container', className)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel className="dialog-panel">
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
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
