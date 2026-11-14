import { Suspense } from 'react';

import { generateMetadata as homeMetadata } from '@/app/app/page';
import { View } from '@/app/View';
import { authorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';

export const generateMetadata = homeMetadata;

const HomeLayout = authorizedRouteLayout('/');

const MainPage = () => {
  return (
    <HomeLayout>
      <Suspense>
        <View />
      </Suspense>
    </HomeLayout>
  );
};

export default MainPage;
