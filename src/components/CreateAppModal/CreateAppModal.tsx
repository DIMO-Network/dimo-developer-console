import {Modal} from "@/components/Modal";
import {Title} from "@/components/Title";
import {FC} from "react";
import {Form} from "@/app/app/create/components";
import {useOnboarding} from "@/hooks";

import './CreateAppModal.css';
import {Loader} from "@/components/Loader";

interface Props {
  isOpen: boolean;
  handleIsOpen: (e: boolean) => void;
}
export const CreateAppModal: FC<Props> = ({ isOpen, handleIsOpen }) => {
  const { workspace, isLoading } = useOnboarding();
  const handleSuccess = async () => {
    handleIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={handleIsOpen} className="create-app-modal">
      {isLoading ? <Loader isLoading={true} /> : (
        <div className="create-app-content">
          <div className="create-app-header">
            <Title className="text-2xl" component="h3">
              Create a new app
            </Title>
          </div>
          <div className={"flex flex-1 w-full py-6"}>
            <Form workspace={workspace} onSuccess={handleSuccess}/>
          </div>
      </div>
      )}
    </Modal>
  );
};
export default CreateAppModal;
