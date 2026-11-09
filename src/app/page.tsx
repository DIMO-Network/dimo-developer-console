import { Suspense } from 'react';

import { generateMetadata as homeMetadata } from '@/app/app/page';
import { View } from '@/app/View';
import { AuthorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';

export const generateMetadata = homeMetadata;

const MainPage = () => {
  return (
    <AuthorizedRouteLayout>
      <Suspense>
        <View />
      </Suspense>
    </AuthorizedRouteLayout>
  );
};

export default MainPage;
