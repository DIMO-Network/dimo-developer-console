import {Modal} from "@/components/Modal";
import {Title} from "@/components/Title";
import {FC} from "react";
import {Form} from "@/app/app/create/components";
import {useOnboarding} from "@/hooks";

import './CreateAppModal.css';

interface Props {
  isOpen: boolean;
  handleIsOpen: () => void;
}
export const CreateAppModal: FC<Props> = ({ isOpen, handleIsOpen }) => {
  const { isLoading, workspace } = useOnboarding();

  return (
    <Modal isOpen={isOpen} setIsOpen={handleIsOpen} className="create-app-modal">
      <div className="create-app-content">
        <div className="create-app-header">
          <Title className="text-2xl" component="h3">
            Create a new app
          </Title>
        </div>
        <div className={"flex flex-1 w-full py-6"}>
          <Form workspace={workspace}/>
        </div>
      </div>
    </Modal>
  );
};
export default CreateAppModal;
