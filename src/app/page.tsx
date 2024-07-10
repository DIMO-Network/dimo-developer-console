import { metadata as homeMetadata } from '@/app/app/page';
import { View } from '@/app/View';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export const metadata = homeMetadata;

const MainPage = () => {
  return (
    <AuthorizedLayout>
      <View />
    </AuthorizedLayout>
  );
};

export default MainPage;
