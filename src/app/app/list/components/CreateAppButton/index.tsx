import React from 'react';
import {PlusIcon} from "@heroicons/react/24/outline";
import {Button} from "@/components/Button";
import {useRouter} from "next/navigation";

const CreateAppButton: React.FC = () => {
  const router = useRouter();

  const handleCreateApp = () => {
    router.push('/app/create');
  };
  return (
    <Button className="dark with-icon !h-10" onClick={handleCreateApp}>
      <PlusIcon className="w-4 h-4" />
      Create an app
    </Button>
  );
};
export default CreateAppButton;
