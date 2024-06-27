import _ from 'lodash';
import { AuthOptions } from 'next-auth';
import { getCsrfToken } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

import config from '@/config';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';

const {
  GITHUB_CLIENT_ID: githubClientId = '',
  GITHUB_CLIENT_SECRET: githubClientSecret = '',
  GOOGLE_CLIENT_ID: googleClientId = '',
  GOOGLE_CLIENT_SECRET: googleClientSecret = '',
  NEXTAUTH_URL: nextAuthUrl = '',
} = process.env;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jwt = async ({
  token,
  account,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  const currentProvider = _.get(token, 'provider', null);
  token.provider = _.get(account, 'provider', currentProvider);

  if (token.provider === 'credentials') {
    token.address = _.get(token, 'sub', null);
  }

  if (!token.userId) {
    const user = await getUserByToken();
    token.userId = _.get(user, 'id', null);
    token.name = _.get(user, 'name', token.name);
    token.email = _.get(user, 'email', token.email);
  }

  return token;
};

export const session = async ({
  session,
  token,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any;
}) => {
  session.user.provider = token.provider;
  session.user.id = token.userId;

  return session;
};

const useSecureCookies = nextAuthUrl.startsWith('https://');
export const cookiePrefix = useSecureCookies ? '__Secure-' : '';
const hostName = new URL(nextAuthUrl).hostname;

export const authOptions: AuthOptions = {
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        name: {
          label: 'Name',
          placeholder: 'John Doe',
          type: 'text',
        },
        email: {
          label: 'Email',
          placeholder: 'johndoe@dimo.zone',
          type: 'text',
        },
        message: {
          label: 'Message',
          placeholder: '0x0',
          type: 'text',
        },
        signature: {
          label: 'Signature',
          placeholder: '0x0',
          type: 'text',
        },
      },
      async authorize(credentials, req) {
        try {
          const siwe = new SiweMessage(
            JSON.parse(credentials?.message || '{}')
          );

          const { host: nextAuthHost } = new URL(config.frontendUrl);
          if (siwe.domain !== nextAuthHost) {
            return null;
          }

          const csrf = await getCsrfToken({ req: { headers: req.headers } });
          if (siwe.nonce !== csrf) {
            return null;
          }

          await siwe.verify({ signature: credentials?.signature || '' });

          return {
            id: siwe.address,
            name: credentials?.name,
            email: credentials?.email,
          };
        } catch (e) {
          console.error(
            'Error while authorizing the user with credentials method',
            { error: e }
          );
          return null;
        }
      },
    }),
    GitHubProvider({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    }),
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: { strategy: 'jwt' },
  debug: process.env.VERCEL_ENV !== 'production',
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName == 'localhost' ? hostName : '.dimo.xyz',
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName == 'localhost' ? hostName : '.dimo.xyz',
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: hostName == 'localhost' ? hostName : '.dimo.xyz',
      },
    },
  },
  callbacks: {
    signIn: async ({ user, account }) => {
      const { email = null } = user ?? {};
      const { provider = null, providerAccountId = null } = account ?? {};

      const { existItem, existAssociation } = await existUserByEmailOrAddress(
        email ?? providerAccountId,
        provider
      );

      return existItem && !existAssociation
        ? '/sign-in?error=unique_email'
        : true;
    },
    jwt,
    session,
  },
};
