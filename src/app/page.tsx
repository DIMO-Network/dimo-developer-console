import { HomePage, metadata as homeMetadata } from '@/app/app/page';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export const metadata = homeMetadata;

const MainPage = () => (
  <AuthorizedLayout>
    <HomePage />
  </AuthorizedLayout>
);

export default MainPage;
