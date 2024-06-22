import { FC } from 'react';

import { getInitials } from '@/utils/user';

import './UserAvatar.css';

type IProps = {
  name: string;
};

export const UserAvatar: FC<IProps> = ({ name }) => {
  return (
    <div className="user-avatar-default" role="user-avatar">
      <p className="default">{getInitials(name)}</p>
    </div>
  );
};

export default UserAvatar;
