'use client';

import { FC, Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { INotification } from '@/hooks';
import classnames from 'classnames';

import './Toast.css';

export const Toast: FC<INotification> = ({ message, type }) => {
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
        <div className={classnames('toast', type)}>
          <div className="toast-content">
            <div className="toast-content-content">
              <p className={classnames("toast-description", type === 'info' && '!text-black')}>{message}</p>
            </div>
            <div className="toast-close-content">
              <button
                type="button"
                className="toast-close-btn"
                role="close-toast"
                onClick={() => {
                  setShow(false);
                }}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className={classnames("h-5 w-5 text-white hover:text-gray-500", type === 'info' && '!text-black')} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </>
  );
};

export default Toast;
