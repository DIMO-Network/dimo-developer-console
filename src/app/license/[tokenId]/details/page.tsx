import { Metadata } from 'next';

import { View } from '@/app/license/[tokenId]/details/components/View';
import configuration from '@/config';

// The page is a client shell with no server data. Rendering each path once and
// serving it from cache spares a function invocation (and its cold start) on
// every visit; the middleware still checks the session first.
export const generateStaticParams = async () => [];

export const metadata: Metadata = {
  title: `License Details | ${configuration.appName}`,
};

// Only params, not searchParams: handing the client view every prop would keep
// the route dynamic, and generateStaticParams could not cache it.
const LicenseDetailsPage = ({ params }: { params: Promise<{ tokenId: string }> }) => (
  <View params={params} />
);
export default LicenseDetailsPage;
