import { Suspense } from 'react';

import { generateMetadata as homeMetadata } from '@/app/app/page';
import { View } from '@/app/View';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export const generateMetadata = homeMetadata;

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
