import { Suspense, type FC } from 'react';

import { View } from './components/View';

const SettingsPage: FC = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default SettingsPage;
