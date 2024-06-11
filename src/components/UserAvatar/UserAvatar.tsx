import { FC } from 'react';

import { getInitials } from '@/utils/user';
import { IUser } from '@/types/user';

import './UserAvatar.css';

type IProps = {
  user?: IUser;
};

export const UserAvatar: FC<IProps> = ({ user }) => {
  return (
    <div className="user-avatar-default" role="user-avatar">
      <p className="default">{getInitials(user ? user.name : '')}</p>
    </div>
  );
};

export default UserAvatar;
