'use client';

import { FC, Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { INotification, TMessageType } from '@/hooks';
import classnames from 'classnames';

import './Toast.css';

// The icon carries the type visually; the sr-only prefix carries it to a
// screen reader, so color is never the only cue.
const TYPE_CUE: Record<TMessageType, { Icon: typeof CheckCircleIcon; label: string }> = {
  success: { Icon: CheckCircleIcon, label: 'Success:' },
  error: { Icon: XCircleIcon, label: 'Error:' },
  info: { Icon: InformationCircleIcon, label: 'Info:' },
};

export const Toast: FC<INotification> = ({ message, type }) => {
  const [show, setShow] = useState(true);
  const { Icon, label } = TYPE_CUE[type] ?? TYPE_CUE.info;

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
        <div
          className={classnames('toast', type)}
          role={type === 'error' ? 'alert' : 'status'}
        >
          <div className="toast-content">
            <Icon className="toast-icon" aria-hidden="true" />
            <div className="toast-content-content">
              <p className="toast-description">
                <span className="sr-only">{label} </span>
                {message}
              </p>
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
