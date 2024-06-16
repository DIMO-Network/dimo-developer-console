import { AuthOptions } from 'next-auth';
import { getCsrfToken } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import NextAuth from 'next-auth/next';

import { jwt, session } from '@/services/auth';

const {
  GITHUB_CLIENT_ID: githubClientId = '',
  GITHUB_CLIENT_SECRET: githubClientSecret = '',
  GOOGLE_CLIENT_ID: googleClientId = '',
  GOOGLE_CLIENT_SECRET: googleClientSecret = '',
} = process.env;

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
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
        console.log('credentials', credentials);
        try {
          const siwe = new SiweMessage(
            JSON.parse(credentials?.message || '{}')
          );
          console.log({ siwe });
          const nextAuthUrl = 'http://localhost:3000/';
          // process.env.NEXTAUTH_URL ||
          //   (process.env.VERCEL_URL
          //     ? `https://${process.env.VERCEL_URL}`
          //     : null);
          if (!nextAuthUrl) {
            return null;
          }

          const nextAuthHost = new URL(nextAuthUrl).host;
          console.log({ nextAuthHost });
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
