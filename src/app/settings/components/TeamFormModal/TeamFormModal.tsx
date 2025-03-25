'use client';

import _ from 'lodash';
import * as Sentry from '@sentry/nextjs';

import { useContext, useState, type FC } from 'react';

import { IInvitation } from '@/types/team';
import { inviteCollaborator } from '@/actions/team';
import { Modal } from '@/components/Modal';
import { NotificationContext } from '@/context/notificationContext';
import { TeamForm } from '@/app/settings/components/TeamForm/TeamForm';
import { Title } from '@/components/Title';

import './TeamFormModal.css';

interface IProps {
  isOpen: boolean;
  setIsOpen: (s: boolean) => void;
}

export const TeamFormModal: FC<IProps> = ({ isOpen, setIsOpen }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);

  const onSubmit = async (invitation: IInvitation) => {
    setIsLoading(true);
    setIsOpen(true);
    try {
      invitation.role = invitation.role.toUpperCase();
      const { success, message } = await inviteCollaborator(invitation);
      if (!success) throw new Error(message);
      setNotification('The invitation was sent', 'Success', 'info');
    } catch (error: unknown) {
      Sentry.captureException(error);
      setNotification(
        _.get(error, 'message', 'Something went wrong'),
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="team-form-modal">
      <div className="team-form-content">
        <div className="team-form-header">
          <Title className="title" component="h3">
            Invite team members
          </Title>
          <p className="description">Invite your team to collaborate with you</p>
        </div>
        <TeamForm isLoading={isLoading} inviteToTeam={onSubmit} />
      </div>
    </Modal>
  );
};

export default TeamFormModal;
