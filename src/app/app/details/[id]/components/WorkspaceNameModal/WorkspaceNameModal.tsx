'use client';

import { type FC } from 'react';
import { useForm } from 'react-hook-form';

import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';

import './WorkspaceNameModal.css';

interface IProps {
  isOpen: boolean;
  setIsOpen: (s: boolean) => void;
  workspaceName: string;
  appName: string;
}

interface IFormInputs {
  workspaceName: string;
  appName: string;
}

export const WorkspaceNameModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  workspaceName,
  appName,
}) => {
  const { register, handleSubmit, reset } = useForm<IFormInputs>({
    defaultValues: {
      workspaceName,
      appName,
    },
  });

  const onSubmit = (data: IFormInputs) => {
    // Implement save logic here
    console.log(data);
    setIsOpen(false);
    reset();
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="workspace-name-modal">
      <form className="workspace-name-content" onSubmit={handleSubmit(onSubmit)}>
        <div className="workspace-name-header">
          <Title className="text-2xl" component="h3">
            Edit Workspace and App Names
          </Title>
          <p className="workspace-name-description">
            Please update the workspace and app names below.
          </p>
        </div>
        <div className="fields-container">
          <div className="field">
            <Label htmlFor="workspaceName" className="text-xs text-medium">
              Workspace Name
              <TextField
                {...register('workspaceName', { required: 'This field is required' })}
                id="workspaceName"
                placeholder="Enter Workspace Name"
                defaultValue={workspaceName}
                className="field"
              />
            </Label>
          </div>
          <div className="field">
            <Label htmlFor="appName" className="text-xs text-medium">
              App Name
              <TextField
                {...register('appName')}
                id="appName"
                placeholder="Enter App Name"
                defaultValue={appName}
                className="field"
              />
            </Label>
          </div>
        </div>
        <Button type="submit" className="primary save-button">
          Save Changes
        </Button>
      </form>
    </Modal>
  );
};

export default WorkspaceNameModal;
