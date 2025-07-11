# Developer Console

This repository hosts the codebase for the DIMO Developer Console, powering the platform at `https://console.dimo.org`. The app facilitates seamless interactions and management of developer licenses within the DIMO ecosystem.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Set Up Google and GitHub OAuth Applications](#set-up-google-and-github-oauth-applications)
  - [Installation](#installation)
  - [Running the Development Server](#running-the-development-server)
  - [Building for Production](#building-for-production)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)

## Getting Started

These instructions will guide you on setting up the project locally.

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/en/download/package-manager) (v20.x or later)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

### Set Up Google and GitHub OAuth Applications

Log in happens through one of two OAuth providers: Google or Github.

1. Create a Google OAuth App:

- Go to the [Google Developer Console](https://console.cloud.google.com/welcome).
- Create a new project (if you don’t already have one).
- Navigate to OAuth consent screen and configure it.
- Under Credentials, create an OAuth 2.0 Client ID.
- Add a Redirect URI: http://localhost:3000/api/auth/callback/google.
- Ensure the app has access to the People API:
  - Go to Library and search for "People API".
  - Enable the People API for your project.
- Note down your Client ID and Client Secret. These will be used in your environment variables.

2. Create a GitHub OAuth App:

- Go to [GitHub Developer Settings](https://github.com/settings/developers).
- Under OAuth Apps, click New OAuth App.
- Set the Authorization callback URL to http://localhost:3000/api/auth/callback/github.
  Under OAuth scopes, ensure the app requests access to email addresses in read-only mode.
- Note down your Client ID and Client Secret. These will be used in your environment variables.

### Run the Dev Console API locally

Follow the setup steps [here](https://github.com/DIMO-Network/dimo-developer-console-api/tree/master?tab=readme-ov-file#developer-console-api) to run the Dev Console API locally.

### Run the Accounts API locally

Follow the setup steps [here](https://github.com/DIMO-Network/accounts?tab=readme-ov-file#dimo-waas) to run the Accounts API locally.

### Installation

1. Clone the repository:

```bash
git clone git@github.com:DIMO-Network/dimo-developer-console.git
cd dimo-developer-console
```

2. Set up environment variables:

- Create a `.env.local` file in the root directory of the project and add the follwing environment variables:

```bash
TURNKEY_ORGANIZATION_ID=<YOUR_SECRET>
TURNKEY_API_PRIVATE_KEY=<YOUR_SECRET>
TURNKEY_API_PUBLIC_KEY=<YOUR_SECRET>
TURNKEY_API_BASE_URL="https://api.turnkey.com"

ZERODEV_PROJECT_ID=<YOUR_SECRET>
BUNDLER_RPC=<YOUR_RPC>
PAYMASTER_RPC=<YOUR_RPC>
VERCEL_ENV="development"

JWT_KEY_SET_URL="https://auth.dev.dimo.zone/keys"
JWT_ISSUER="https://auth.dev.dimo.zone"

NEXT_PUBLIC_TURNKEY_API_BASE_URL="https://api.turnkey.com"
NEXT_PUBLIC_DIMO_AUTH_URL="https://auth.dev.dimo.zone"
NEXT_PUBLIC_RPC_URL=<YOUR_RPC>
RPC_URL=<YOUR_RPC>
NEXT_PUBLIC_TURNKEY_API_BASE_URL="https://api.turnkey.com"
NEXT_PUBLIC_RPID="localhost"
NEXT_PUBLIC_GA_API=<YOUR_ACCOUNTS_API_URL>
```
Make sure that the `NEXT_PUBLIC_GA_API` maps to your [Accounts API](https://github.com/DIMO-Network/accounts/tree/main) deployment URL.

3. Install the dependencies:

```bash
npm install
# or
yarn install
```

### Running the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
```

### Building for Production

To create an optimized production build:

```bash
npm run build
# or
yarn build
```

To start the production server:

```bash
npm run start
# or
yarn start
```

## GraphQL

This repository uses [GraphQL Codegen](https://the-guild.dev/graphql/codegen) to automatically generate Typescript types from GraphQL schemas and operations.

### How to generate types

Write your query or mutation according to the docs, then generate types by running the following command

```bash
npm run compile
```

The types will be made available for export into the app from the `src/gql` directory.

## Project Structure

This project is built with Next.js, which requires specific folder structures and file-naming conventions to structure the application. To understand this, read the docs at https://nextjs.org.

A brief description of the main folders and files in the project:

- `./src/app`: Contains all the application pages and API routes using the new App Router in Next.js.
- `./src/config`: Configuration files
  - `default` is mainly used for the development environment and default values in `staging` and `prod`
  - `preview` is mainly used for changing variable values in the staging environment.
  - `production` is mainly used for changing variable values in the production environment.
- `./src/components`: Reusable React components used across the application.
- `/public`: Static files like images, fonts, etc
- `./src/context`: React context providers and hooks for managing global state across the application.
- `./src/hoc`: Higher-Order Components (HOCs) that provide additional functionality to wrapped components.
- `./src/layouts`: Layout components that define the structure of different pages or sections of the application.
- `./src/services`: Contains the business logic of the application, interacting with the database, APIs, and other services.
- `./src/types`: TypeScript type definitions and interfaces used throughout the application.
- `./src/utils`: Utility functions and helper methods that are used across different parts of the application.
- `./src/actions`: Server-side methods that interact with external APIs or perform specific tasks in response to client requests.

## Technologies Used

- **Next.js**: A React framework for server-side rendering, static site generation, and more.
- **React**: A JavaScript library for building user interfaces.
- **CSS/PostCSS**: For styling components.
- **JavaScript/ES6+**: Modern JavaScript syntax and features.
- **GraphQL**: A query language for interacting with APIs

## Contributing

We welcome contributions to this project! If you would like to contribute, please follow these steps:

1. Fork the repository on GitHub by clicking the "Fork" button at the top right of the repository page.

2. Clone your forked repository to your local machine:

```bash
git clone https://github.com/your-username/your-forked-repository.git
cd your-forked-repository
```

3. Create a new branch for your feature or bug fix:

```bash
git checkout -b feature/your-feature-name
```

4. Make your changes in the codebase.

5. Commit your changes with a clear and concise commit message:

```bash
git commit -m "Add feature/fix: Describe your changes"
```

6. Push your changes to your forked repository on GitHub:

```bash
git push origin feature/your-feature-name
```

7. Open a Pull Request:

- Go to the original repository on GitHub.
- Click on the "Pull Requests" tab.
- Click the "New Pull Request" button.
- Select the branch you made your changes on and submit the Pull Request.

8. Describe your changes in the Pull Request. Provide as much detail as possible about what you’ve done and why.

9. Wait for a review from the maintainers. They may ask for changes or provide feedback.

10. Once your Pull Request is approved, it will be merged into the main branch.

Thank you for contributing to the project!
