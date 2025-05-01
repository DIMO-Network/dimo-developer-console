import { FC } from 'react';
import { capitalize } from 'lodash';
import classNames from 'classnames';

interface Props {
  status: 'active' | 'inactive';
}

export const StatusBadge: FC<Props> = ({ status }) => {
  const getBackgroundColor = () => {
    switch (status) {
      case 'active':
        return 'bg-feedback-success';
      case 'inactive':
        return 'bg-feedback-error';
      default:
        return null;
    }
  };
  return (
    <div className={classNames('w-fit py-0.5 px-2 rounded-full', getBackgroundColor())}>
      {capitalize(status)}
    </div>
  );
};
