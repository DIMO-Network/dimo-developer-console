import _ from 'lodash';
import { AuthOptions } from 'next-auth';
import { getCsrfToken } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';


import config from '@/config';
import { getUserByToken } from '@/services/user';

const {
  GITHUB_CLIENT_ID: githubClientId = '',
  GITHUB_CLIENT_SECRET: githubClientSecret = '',
  GOOGLE_CLIENT_ID: googleClientId = '',
  GOOGLE_CLIENT_SECRET: googleClientSecret = '',
} = process.env;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jwt = async ({
  token,
  account,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  const currentProvider = _.get(token, 'provider', null);
  const provider = _.get(account, 'provider', currentProvider);
  const address = _.get(token, 'sub', null);

  token.provider = provider;
  token.address = address;

  if (!token.userId) {
    const user = await getUserByToken();
    const userId = _.get(user, 'id', null);
    token.userId = userId;
  }

  console.log({ token });
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

export const authOptions: AuthOptions = {
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

          if (
            siwe.nonce !==
            (await getCsrfToken({ req: { headers: req.headers } }))
          ) {
            return null;
          }

          await siwe.verify({ signature: credentials?.signature || '' });
          console.log({ id: siwe.address });

          return {
            id: siwe.address,
            name: credentials?.name,
            email: credentials?.email,
          };
        } catch (e) {
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
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXAUTH_SECRET,
  callbacks: {
    jwt,
    session,
  },
};
