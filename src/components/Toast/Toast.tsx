'use client';

import { FC, Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import {
  CheckCircleIcon,
  XMarkIcon as XMarkIcon24,
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';

import { INotification } from '@/hooks';

import './Toast.css';

export const Toast: FC<INotification> = ({ title, message, type }) => {
  const [show, setShow] = useState(true);

  return (
    <>
      <Transition
        show={show}
        as={Fragment}
        enter="transform ease-out duration-300 transition"
        enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enterTo="translate-y-0 opacity-100 sm:translate-x-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="toast">
          <div className="toast-content">
            <div className="toast-icon-content">
              {type === 'success' && (
                <CheckCircleIcon
                  className="h-6 w-6 text-green-400"
                  aria-hidden="true"
                />
              )}
              {type === 'error' && (
                <XMarkIcon24
                  className="h-6 w-6 text-red-400"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="toast-content-content">
              <p className="toast-title">{title}</p>
              <p className="toast-description">{message}</p>
            </div>
            <div className="toast-close-content">
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => {
                  setShow(false);
                }}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </>
  );
};

export default Toast;
