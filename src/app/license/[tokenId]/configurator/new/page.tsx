import { Metadata } from 'next';
import { View } from './components/View';
import { OwnerOnly } from '@/components/OwnerOnly';
import configuration from '@/config';

// The page is a client shell with no server data. Rendering each path once and
// serving it from cache spares a function invocation (and its cold start) on
// every visit; the middleware still checks the session first.
export const generateStaticParams = async () => [];

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

// Only params, not searchParams: handing the client view every prop would keep
// the route dynamic, and generateStaticParams could not cache it.
const NewConfiguratorPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <OwnerOnly feature="Configurations">
    <View params={params} />
  </OwnerOnly>
);
export default NewConfiguratorPage;
