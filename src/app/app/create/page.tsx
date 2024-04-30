import { Title } from '@/components/Title/Title';
import { Form } from '@/app/app/create/components/Form';

import './page.css';

export const CreateAppPage = () => {
  return (
    <div className='page'>
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
