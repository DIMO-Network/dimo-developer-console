import { AuthOptions } from 'next-auth';
import { getCsrfToken } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

import { getUserByToken } from '@/services/user';
import { IUser } from '@/types/user';
import { TeamRoles } from '@/types/team';
import * as Sentry from '@sentry/nextjs';

import config from '@/config';

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
  const currentProvider = token?.provider ?? null;
  token.provider = account?.provider ?? currentProvider;

  if (token.provider === 'credentials') {
    token.address = token?.sub ?? null;
  }

  const user = (await getUserByToken().catch(() => ({}))) as Partial<IUser>;
  token.userId = user?.id ?? null;
  token.name = user?.name ?? token.name;
  token.email = user?.email ?? token.email;
  token.role = user?.role ?? TeamRoles.COLLABORATOR;

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
  session.user.role = token.role;

  return session;
};

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
          const siwe = new SiweMessage(JSON.parse(credentials?.message || '{}'));

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
          Sentry.captureException(e);
          console.error('Error while authorizing the user with credentials method', {
            error: e,
          });
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
  callbacks: {
    jwt,
    session,
  },
};

//TODO: check if removing the signin callback will break the app
