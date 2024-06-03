import { Title } from '@/components/Title';
import { Form } from '@/app/app/create/components/Form';
import { BackButton } from '@/components/BackButton';

import './page.css';

export const CreateAppPage = () => {
  return (
    <div className="page">
      <BackButton />
      <div className="page-title">
        <Title>Create a new app</Title>
      </div>
      <div className="form">
        <Form />
      </div>
    </div>
  );
};

export default CreateAppPage;
