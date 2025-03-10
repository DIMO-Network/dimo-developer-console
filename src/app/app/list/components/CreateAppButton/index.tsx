import React from 'react';
import {PlusIcon} from "@heroicons/react/24/outline";
import {Button} from "@/components/Button";
import clsx from 'classnames';
import useOnboarding from "@/hooks/useOnboarding";
import {CreateAppModal} from "@/components/CreateAppModal";

interface Props {
  className?: string;
}

const CreateAppButton: React.FC<Props> = ({ className = 'dark with-icon' }) => {
  const {handleCreateApp} = useOnboarding();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  return (
    <>
      <CreateAppModal isOpen={isModalOpen} handleIsOpen={() => {setIsModalOpen(false);}} />
      <Button className={clsx(className, "!h-10")} onClick={() => setIsModalOpen(true)}>
        <PlusIcon className="w-4 h-4" />
        Create an app
      </Button>
    </>

  );
};
export default CreateAppButton;
