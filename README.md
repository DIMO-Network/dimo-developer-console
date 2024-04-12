# DIMO Developer Console

## Getting Started

### Configuration file

Before running the application, you will need to set up some local variables. First, create the `.env.local` file in the root folder with the following content.

```sh
GITHUB_CLIENT_ID=<YOUR_GITHUB_CLIENT_ID>
GITHUB_CLIENT_SECRET=<YOUR_GITHUB_CLIENT_SECRET>

GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
```

Please, follow these instructions to get your client id and client secret

- [Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
- [Setting up OAuth 2.0](https://support.google.com/cloud/answer/6158849?hl=en)

**Note**: You must add the People API for the project you created

### Running the app locally

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development links

To learn more about the technologies used, take a look at the following resources:

- [React Documentation](https://react.dev/learn) - learn about React
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [TailwindCSS Documentation](https://tailwindcss.com/docs) - learn about tailwind
- [Typescript Documentation](https://www.typescriptlang.org/docs/) - learn about typescript
- [Jest Documentation](https://jestjs.io/docs/getting-started) - learn about testing with jest
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - learn about React Testing Library
