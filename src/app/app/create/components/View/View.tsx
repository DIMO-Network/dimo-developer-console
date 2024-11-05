'use client';

import { BackButton } from '@/components/BackButton';
import { Form } from '@/app/app/create/components/Form';
import { Loader } from '@/components/Loader';
import { Title } from '@/components/Title';
import { useOnboarding } from '@/hooks';

import './View.css';

const CreateAppPage = () => {
  const { isLoading, workspace } = useOnboarding();
  return (
    <>
      {isLoading && <Loader isLoading={isLoading} />}
      {!isLoading && (
        <div className="page">
          <BackButton />
          <div className="page-title">
            <Title>Create a new app</Title>
          </div>
          <div className="form">
            <Form
              workspace={workspace}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default CreateAppPage;
