import { Suspense } from 'react';

import { metadata as homeMetadata } from '@/app/app/page';
import { View } from '@/app/View';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export const metadata = homeMetadata;

const MainPage = () => {
  return (
    <AuthorizedLayout>
      <Suspense>
        <View />
      </Suspense>
    </AuthorizedLayout>
  );
};

export default MainPage;
