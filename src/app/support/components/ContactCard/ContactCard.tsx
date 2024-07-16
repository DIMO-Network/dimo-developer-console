import { type FC } from 'react';

import { Card } from '@/components/Card';
import { IconProps } from '@/components/Icons';

import './ContactCard.css';

interface IProps {
  title: string;
  description: string;
  Icon: FC<IconProps>;
}

export const ContactCard: FC<IProps> = ({ title, description, Icon }) => {
  return (
    <Card className="card-border contact-card">
      <div className="content">
        <p className="title">{title}</p>
        <p className="description">{description}</p>
      </div>
      <div className="icon">
        <Icon className="h-6 w-6" />
      </div>
    </Card>
  );
};

export default ContactCard;
