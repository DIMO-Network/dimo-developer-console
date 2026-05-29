# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the DIMO Developer Console with DIMO Teal design tokens, dark/light mode, a collapsible grouped sidebar, shadcn/ui primitives, and UX simplifications (no environment labels, balances in $).

**Architecture:** Foundation-first — CSS variables + Tailwind darkMode → ThemeProvider + layout → shadcn primitives → cleanup. Each task is independently shippable. No flows broken: existing component props and hook APIs are preserved; only visuals and the notification system change.

**Tech Stack:** Next.js App Router, Tailwind CSS, shadcn/ui, next-themes, Sonner, @heroicons/react (kept)

---

## Task 1: shadcn/ui Init + DIMO Token Layer

**Files:**

- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `src/lib/utils.ts`
- Creates (auto): `components.json`

- [ ] **Step 1: Install dependencies**

```bash
npm install next-themes
npm install lucide-react
npx shadcn@latest init
```

When prompted by shadcn init:

- Style: **Default**
- Base color: **Neutral**
- Global CSS: `src/app/globals.css` → **yes**
- CSS variables: **yes**
- Tailwind config: `tailwind.config.ts`
- Components alias: `@/components/ui`
- React Server Components: **yes**

- [ ] **Step 2: Verify `src/lib/utils.ts` was created by shadcn init**

It should contain:

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

If not created, create it now with the above content. Also verify `clsx` and `tailwind-merge` were added to `package.json`.

- [ ] **Step 3: Replace globals.css with DIMO Teal tokens**

Replace the entire contents of `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 180 33% 96%;
    --foreground: 180 71% 13%;

    --card: 0 0% 100%;
    --card-foreground: 180 71% 13%;

    --sidebar: 0 0% 100%;

    --popover: 0 0% 100%;
    --popover-foreground: 180 71% 13%;

    --primary: 178 66% 40%;
    --primary-foreground: 0 0% 100%;

    --secondary: 180 33% 93%;
    --secondary-foreground: 180 71% 13%;

    --muted: 180 33% 93%;
    --muted-foreground: 178 78% 23%;

    --accent: 180 33% 93%;
    --accent-foreground: 180 71% 13%;

    --destructive: 0 78% 42%;
    --destructive-foreground: 0 0% 100%;

    --border: 177 51% 80%;
    --input: 177 51% 80%;
    --ring: 178 66% 40%;

    --radius: 0.625rem;
  }

  .dark {
    --background: 180 32% 3%;
    --foreground: 177 65% 88%;

    --card: 180 30% 9%;
    --card-foreground: 177 65% 88%;

    --sidebar: 180 35% 6%;

    --popover: 180 30% 9%;
    --popover-foreground: 177 65% 88%;

    --primary: 178 66% 40%;
    --primary-foreground: 0 0% 0%;

    --secondary: 180 30% 12%;
    --secondary-foreground: 177 60% 64%;

    --muted: 180 22% 30%;
    --muted-foreground: 177 60% 64%;

    --accent: 180 30% 12%;
    --accent-foreground: 177 65% 88%;

    --destructive: 0 99% 71%;
    --destructive-foreground: 0 0% 0%;

    --border: 180 28% 14%;
    --input: 180 28% 14%;
    --ring: 178 66% 40%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground text-sm font-light not-italic;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 4: Update `tailwind.config.ts` — darkMode + token colors**

Replace the entire file:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'background': 'hsl(var(--background))',
        'foreground': 'hsl(var(--foreground))',
        'card': {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'sidebar': 'hsl(var(--sidebar))',
        'popover': {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        'primary': {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        'secondary': {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        'muted': {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        'accent': {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        'destructive': {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        'border': 'hsl(var(--border))',
        'input': 'hsl(var(--input))',
        'ring': 'hsl(var(--ring))',
        /* Legacy aliases — keep so existing classnames don't break during migration */
        'surface': {
          default: 'hsl(var(--card))',
          sunken: 'hsl(var(--background))',
          raised: 'hsl(var(--accent))',
        },
        'cta': {
          default: 'hsl(var(--accent))',
          disabled: 'hsl(var(--muted))',
        },
        'feedback': {
          success: '#0D7038',
          error: 'hsl(var(--destructive))',
        },
        'text': {
          secondary: 'hsl(var(--muted-foreground))',
        },
        /* Existing palette scales — keep for gradual cleanup */
        'grey': {
          '50': '#f5f6f6',
          '100': '#e4e8e9',
          '200': '#ccd4d5',
          '300': '#a9b5b7',
          '400': '#7e8f92',
          '500': '#637377',
          '600': '#556166',
          '700': '#495256',
          '800': '#40484a',
          '900': '#393e40',
          '950': '#232729',
        },
        'primary-scale': {
          '50': '#f1fcfa',
          '100': '#d0f7f2',
          '200': '#b7f2eb',
          '300': '#6aded5',
          '400': '#3bc6be',
          '500': '#22aaa5',
          '600': '#198886',
          '700': '#186d6d',
          '800': '#185657',
          '900': '#184849',
          '950': '#08292b',
        },
        'red': {
          '50': '#fff1f1',
          '100': '#ffe1e1',
          '200': '#ffc8c8',
          '300': '#ffa1a1',
          '400': '#fe6b6b',
          '500': '#f85454',
          '600': '#e51d1d',
          '700': '#c01515',
          '800': '#9f1515',
          '900': '#841818',
          '950': '#480707',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run compile
```

Expected: no errors. If shadcn added conflicting config, reconcile with the above.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/lib/utils.ts components.json package.json package-lock.json
git commit -m "feat: add DIMO Teal token layer and shadcn/ui foundation"
```

---

## Task 2: ThemeProvider + ThemeToggle

**Files:**

- Modify: `src/layouts/RootLayout/RootLayout.tsx`
- Create: `src/components/Header/ThemeToggle.tsx`

- [ ] **Step 1: Wrap RootLayout with ThemeProvider**

Replace `src/layouts/RootLayout/RootLayout.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { dimoFont } from '@/utils/font';
import configuration from '@/config';
import '@/app/globals.css';
import QueryProvider from '@/hoc/QueryProvider';
import { useMixPanel } from '@/hooks';

export const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const { initMixPanel } = useMixPanel();
  useEffect(() => {
    initMixPanel();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dimoFont.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
```

Note: `suppressHydrationWarning` on `<html>` is required by next-themes to suppress the class mismatch warning during SSR hydration.

- [ ] **Step 2: Create ThemeToggle component**

Create `src/components/Header/ThemeToggle.tsx`:

```tsx
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-[52px] h-[26px] rounded-full bg-card border border-border" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <div
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className="flex items-center gap-0.5 bg-card border border-border rounded-full p-0.5 cursor-pointer"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span
        className={cn(
          'w-6 h-[18px] rounded-full flex items-center justify-center text-[10px] transition-colors',
          !isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        ☀
      </span>
      <span
        className={cn(
          'w-6 h-[18px] rounded-full flex items-center justify-center text-[10px] transition-colors',
          isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        ☾
      </span>
    </div>
  );
};
```

- [ ] **Step 3: Add ThemeToggle to Header**

In `src/components/Header/Header.tsx`, import and add `ThemeToggle` to the `user-information` div:

```tsx
import { type FC } from 'react';
import './Header.css';
import { usePathname } from 'next/navigation';
import { getPageTitle } from '@/config/navigation';
import { CreditsWidget } from '@/components/CreditsWidget';
import { AccountInfoButton } from '@/components/AccountInfoButton';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';
import { ThemeToggle } from '@/components/Header/ThemeToggle';

export const Header: FC = () => {
  const pathname = usePathname();

  return (
    <header className="header">
      <p className="page-title">{getPageTitle(pathname) ?? ''}</p>
      <div className="user-information" role="user-information">
        <CreditsWidget />
        <ThemeToggle />
        <DeveloperSupportButton variant={'small'} />
        <AccountInfoButton />
      </div>
    </header>
  );
};
```

- [ ] **Step 4: Run the dev server and verify the toggle works**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:

- The sun/moon toggle pill appears in the header
- Clicking it switches between light and dark mode
- The mode persists across page refresh
- No hydration errors in the console

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: snapshot tests for Header will fail (the component changed). Update them:

```bash
npm run test:update-snap
```

Then re-run `npm test` — all should pass.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/RootLayout/RootLayout.tsx src/components/Header/ThemeToggle.tsx src/components/Header/Header.tsx
git commit -m "feat: add dark/light mode toggle via next-themes"
```

---

## Task 3: LayoutContext + Sidebar Collapse State

**Files:**

- Modify: `src/context/LayoutContext.ts`
- Modify: `src/hoc/withLayout.tsx`

- [ ] **Step 1: Write the failing test**

In `__tests__/hoc/withLayout.test.tsx` (create if it doesn't exist):

```tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { LayoutContext } from '@/context/LayoutContext';
import { withLayout } from '@/hoc/withLayout';

const TestConsumer = () => {
  const { isSidebarCollapsed, setSidebarCollapsed } = useContext(LayoutContext);
  return (
    <div>
      <span data-testid="state">{isSidebarCollapsed ? 'collapsed' : 'expanded'}</span>
      <button onClick={() => setSidebarCollapsed(true)}>collapse</button>
    </div>
  );
};

const Wrapped = withLayout(TestConsumer);

describe('withLayout', () => {
  it('provides isSidebarCollapsed defaulting to false', () => {
    render(<Wrapped />);
    expect(screen.getByTestId('state').textContent).toBe('expanded');
  });

  it('setSidebarCollapsed updates state', async () => {
    render(<Wrapped />);
    await userEvent.click(screen.getByText('collapse'));
    expect(screen.getByTestId('state').textContent).toBe('collapsed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="withLayout" --no-coverage
```

Expected: FAIL — `isSidebarCollapsed` not found on context.

- [ ] **Step 3: Update LayoutContext**

Replace `src/context/LayoutContext.ts`:

```ts
import { createContext } from 'react';

interface ILayoutContext {
  isFullScreenMenuOpen: boolean;
  setIsFullScreenMenuOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const LayoutContext = createContext<ILayoutContext>({
  isFullScreenMenuOpen: false,
  setIsFullScreenMenuOpen: () => {},
  isSidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});
```

- [ ] **Step 4: Update withLayout HOC to manage collapse state**

Replace `src/hoc/withLayout.tsx`:

```tsx
import React, { ComponentType, useEffect, useState } from 'react';
import { LayoutContext } from '@/context/LayoutContext';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export const withLayout = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const [isFullScreenMenuOpen, setIsFullScreenMenuOpen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsedState] = useState(false);

    useEffect(() => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === 'true') setSidebarCollapsedState(true);
    }, []);

    const setSidebarCollapsed = (collapsed: boolean) => {
      setSidebarCollapsedState(collapsed);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    };

    return (
      <LayoutContext.Provider
        value={{
          isFullScreenMenuOpen,
          setIsFullScreenMenuOpen,
          isSidebarCollapsed,
          setSidebarCollapsed,
        }}
      >
        <WrappedComponent {...props} />
      </LayoutContext.Provider>
    );
  };

  HOC.displayName = `withLayout(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --testPathPattern="withLayout" --no-coverage
```

Expected: PASS

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/context/LayoutContext.ts src/hoc/withLayout.tsx
git commit -m "feat: add sidebar collapse state to LayoutContext"
```

---

## Task 4: Navigation Sections + Sidebar Redesign

**Files:**

- Modify: `src/config/navigation.ts`
- Modify: `src/components/Menu/Menu.tsx`
- Modify: `src/components/Menu/Menu.css`
- Modify: `src/components/Menu/MenuItem/MenuItem.tsx`
- Modify: `src/components/Menu/MenuItem/MenuItem.css`
- Modify: `src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`
- Modify: `src/layouts/AuthorizedLayout/AuthorizedLayout.css`

- [ ] **Step 1: Add section structure to navigation config**

In `src/config/navigation.ts`, add a `NavSection` type and `getNavSections` export after the existing exports:

```ts
export type NavItem = {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconClassName: string;
  link: string | (() => void);
  external: boolean;
  disabled: boolean;
  hidden?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const getNavSections = (includeConnections: boolean = true): NavSection[] => [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Home',
        icon: HomeIcon,
        iconClassName: 'h-4 w-4',
        link: '/app',
        external: false,
        disabled: false,
      },
      {
        label: 'Webhooks',
        icon: IntegrationIcon,
        iconClassName: 'h-4 w-4 fill-current stroke-current stroke-1',
        link: '/webhooks',
        external: false,
        disabled: false,
      },
      ...(includeConnections
        ? [
            {
              label: 'Connections',
              icon: ConnectionsIcon,
              iconClassName: 'h-4 w-4',
              link: '/connections',
              external: false,
              disabled: false,
            },
          ]
        : []),
    ],
  },
  {
    label: 'Resources',
    items: [
      {
        label: 'Data Explorer',
        icon: ChipIcon,
        iconClassName: 'h-4 w-4',
        link: '/explorer',
        external: false,
        disabled: false,
      },
      {
        label: 'Documentation',
        icon: SummarizeIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://dimo.org/docs',
        external: true,
        disabled: false,
      },
      {
        label: 'API Status',
        icon: MonitorHeartIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://stats.uptimerobot.com/snU0rkEEah',
        external: true,
        disabled: false,
      },
    ],
  },
];
```

Add `import React from 'react';` at the top of the file if not already present.

- [ ] **Step 2: Rewrite MenuItem to use token classes**

Replace `src/components/Menu/MenuItem/MenuItem.tsx`:

```tsx
import { type FC, PropsWithChildren, useContext } from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { LayoutContext } from '@/context/LayoutContext';
import { cn } from '@/lib/utils';

interface IProps {
  link: string | (() => void);
  disabled: boolean;
  external: boolean;
  iconClassName: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: FC<any>;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
}

export const MenuItem: FC<IProps> = ({
  link,
  external,
  disabled,
  icon: Icon,
  iconClassName,
  label,
  isHighlighted,
  isCollapsed,
}) => {
  const { isFullScreenMenuOpen, setIsFullScreenMenuOpen } = useContext(LayoutContext);

  const closeFullScreenMenu = () => {
    if (isFullScreenMenuOpen) setIsFullScreenMenuOpen(false);
  };

  const handleFunctionClick = () => {
    if (typeof link === 'function') {
      link();
      closeFullScreenMenu();
    }
  };

  const Wrapper: FC<PropsWithChildren> = ({ children }) => {
    if (typeof link === 'function') {
      return <button onClick={handleFunctionClick}>{children}</button>;
    }
    return (
      <Link
        href={disabled ? '#' : link}
        target={external ? '_blank' : '_self'}
        onClick={closeFullScreenMenu}
      >
        {children}
      </Link>
    );
  };

  return (
    <li
      title={isCollapsed ? label : undefined}
      className={cn(
        'flex flex-row items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        isHighlighted && 'text-muted-foreground bg-primary/10 hover:bg-primary/15',
        disabled && 'opacity-40 pointer-events-none',
        isCollapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn(iconClassName, isHighlighted && 'text-primary')} />
      {!isCollapsed && <Wrapper>{label}</Wrapper>}
      {isCollapsed && (
        <Wrapper>
          <span className="sr-only">{label}</span>
        </Wrapper>
      )}
    </li>
  );
};
```

Replace `src/components/Menu/MenuItem/MenuItem.css` with an empty file (styles are now inline Tailwind):

```css
/* styles moved to Tailwind classes in MenuItem.tsx */
```

- [ ] **Step 3: Rewrite Menu.tsx with grouped sections + collapse button**

Replace `src/components/Menu/Menu.tsx`:

```tsx
import { type FC, useContext } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import * as Sentry from '@sentry/nextjs';

import { MenuItem } from '@/components/Menu/MenuItem';
import { getNavSections, bottomMenu } from '@/config/navigation';
import { useHasDeveloperLicenses } from '@/hooks';
import { LayoutContext } from '@/context/LayoutContext';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { GlobalAccountSession, removeFromSession } from '@/utils/sessionStorage';
import { EmbeddedKey, removeFromLocalStorage } from '@/utils/localStorage';
import { queryClient } from '@/hoc/QueryProvider';
import { LogoutIcon } from '@/components/Icons/LogoutIcon';
import { cn } from '@/lib/utils';

import './Menu.css';

export const Menu: FC = withLoadingStatus(() => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const {
    isFullScreenMenuOpen,
    setIsFullScreenMenuOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = useContext(LayoutContext);
  const pathname = usePathname();
  const router = useRouter();
  const { hasDeveloperLicenses, loading: licensesLoading } = useHasDeveloperLicenses();

  const onSignOut = async () => {
    try {
      setLoadingStatus({ status: 'loading', label: 'Signing out' });
      await signOut();
      await turnkeyClient.logout();
      queryClient.clear();
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
      clearLoadingStatus();
      router.replace('/sign-in');
    } catch (err) {
      Sentry.captureException(err);
      setLoadingStatus({ status: 'error', label: 'There was a problem signing you out' });
    }
  };

  const isHighlighted = (link: string | (() => void)) =>
    typeof link === 'string' && pathname.startsWith(link);

  const logoutItem = {
    label: 'Logout',
    icon: LogoutIcon,
    iconClassName: 'h-4 w-4',
    link: onSignOut,
    external: false,
    disabled: false,
  };

  const sections = getNavSections(licensesLoading || hasDeveloperLicenses);

  return (
    <div className={cn('main-menu', isSidebarCollapsed && 'collapsed')}>
      {/* Logo */}
      <div className={cn('logo-row', isSidebarCollapsed && 'justify-center')}>
        {!isSidebarCollapsed && (
          <Image
            src={'/images/dimo-dev.svg'}
            alt="DIMO Logo"
            width={140}
            height={20}
            className="mb-8"
          />
        )}
        {isSidebarCollapsed && (
          <div className="mb-8 w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-black">D</span>
          </div>
        )}
        {isFullScreenMenuOpen && (
          <button
            onClick={() => setIsFullScreenMenuOpen(false)}
            className="md:hidden ml-auto"
          >
            <XMarkIcon className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Grouped nav sections */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            {!isSidebarCollapsed && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items
                .filter((item) => !('hidden' in item && item.hidden))
                .map((item) => (
                  <MenuItem
                    key={String(item.link)}
                    {...item}
                    isHighlighted={isHighlighted(item.link)}
                    isCollapsed={isSidebarCollapsed}
                  />
                ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={cn('bottom-section', isSidebarCollapsed && 'items-center')}>
        <ul className="flex flex-col gap-0.5">
          {bottomMenu.map((item) => (
            <MenuItem
              key={String(item.link)}
              {...item}
              isHighlighted={isHighlighted(item.link)}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
          <MenuItem
            {...logoutItem}
            isHighlighted={false}
            isCollapsed={isSidebarCollapsed}
          />
        </ul>
      </div>

      {/* Collapse toggle button — desktop only */}
      <button
        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="collapse-btn hidden md:flex"
      >
        {isSidebarCollapsed ? (
          <ChevronRightIcon className="h-3 w-3 text-primary" />
        ) : (
          <ChevronLeftIcon className="h-3 w-3 text-primary" />
        )}
      </button>
    </div>
  );
});
```

- [ ] **Step 4: Replace Menu.css**

Replace `src/components/Menu/Menu.css`:

```css
.main-menu {
  @apply relative w-full px-3 py-5 flex flex-col gap-2 bg-sidebar;
  transition: width 200ms ease;
}

.logo-row {
  @apply flex flex-row items-start;
}

.bottom-section {
  @apply border-t border-border pt-3 mt-2;
}

.collapse-btn {
  @apply absolute -right-2.5 top-1/2 -translate-y-1/2 z-10
         w-5 h-5 rounded-full bg-card border border-border
         items-center justify-center shadow-sm
         hover:bg-accent transition-colors;
}
```

- [ ] **Step 5: Update AuthorizedLayout.css for sidebar width transition**

Replace `src/layouts/AuthorizedLayout/AuthorizedLayout.css`:

```css
.main {
  @apply flex flex-row bg-background min-h-screen items-stretch;
}

.sidebar-container {
  @apply hidden md:block md:flex-shrink-0;
  transition: width 200ms ease;
}

.sidebar-container.expanded {
  @apply md:w-[168px];
}

.sidebar-container.collapsed {
  @apply md:w-[50px];
}

.header-container {
  @apply flex flex-row items-center;
}

.menu-header-button {
  @apply md:hidden;
}

.app-content {
  @apply flex flex-col flex-1 min-w-0;
}

.page-content {
  @apply overflow-y-auto overflow-x-auto p-4 flex-1;
}
```

- [ ] **Step 6: Update AuthorizedLayout.tsx to apply width classes**

In `src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`, read `isSidebarCollapsed` from `LayoutContext` and apply the correct class:

```tsx
'use client';
import React, { useContext } from 'react';
import { MenuButton } from '@/components/Menu/MenuButton';
import {
  withCredits,
  withNotifications,
  withGlobalAccounts,
  withApollo,
  withAccountInformation,
  withLayout,
} from '@/hoc';
import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { FullScreenMenu } from '@/components/Menu/FullScreenMenu';
import { LayoutContext } from '@/context/LayoutContext';
import { cn } from '@/lib/utils';
import './AuthorizedLayout.css';

const Providers = withNotifications(
  withGlobalAccounts(
    withLayout(
      withCredits(
        withApollo(
          withAccountInformation(({ children }: { children: React.ReactNode }) => (
            <>{children}</>
          )),
        ),
      ),
    ),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    <Providers>
      <Layout>{children}</Layout>
    </Providers>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarCollapsed } = useContext(LayoutContext);

  return (
    <div className="main">
      <div
        className={cn('sidebar-container', isSidebarCollapsed ? 'collapsed' : 'expanded')}
      >
        <Menu />
      </div>
      <div className="app-content">
        <div className="header-container">
          <div className="menu-header-button">
            <MenuButton />
          </div>
          <Header />
        </div>
        <FullScreenMenu />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

export default AuthorizedLayout;
```

- [ ] **Step 7: Run dev server and verify sidebar**

```bash
npm run dev
```

Verify:

- Sidebar shows "Workspace" and "Resources" section labels
- Active nav item has teal highlight
- Clicking the chevron button collapses the sidebar to icon-only (~50px)
- Collapsed state persists on page refresh
- Mobile full-screen menu still works (hamburger button)

- [ ] **Step 8: Run tests and update snapshots**

```bash
npm test
```

Update any failing snapshots:

```bash
npm run test:update-snap
```

Then verify:

```bash
npm test
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/config/navigation.ts src/components/Menu/ src/layouts/AuthorizedLayout/ src/context/LayoutContext.ts src/hoc/withLayout.tsx
git commit -m "feat: redesign sidebar with grouped sections and collapse toggle"
```

---

## Task 5: Header CSS + CreditsWidget Pill Redesign

**Files:**

- Modify: `src/components/Header/Header.css`
- Modify: `src/components/CreditsWidget/CreditsWidget.tsx`
- Modify: `src/components/CreditsWidget/CreditsWidget.css`

- [ ] **Step 1: Update Header.css to use tokens**

Replace `src/components/Header/Header.css`:

```css
.header {
  @apply flex h-12 md:h-14 items-center justify-between px-4 md:px-6
         bg-sidebar border-b border-border w-full;

  .page-title {
    @apply text-lg font-bold text-foreground;
  }

  .user-information {
    @apply flex flex-row gap-3 items-center;
  }
}
```

- [ ] **Step 2: Update CreditsWidget visual to teal pill**

Replace `src/components/CreditsWidget/CreditsWidget.tsx` — keep all existing logic, only change the JSX structure for the `small` variant:

```tsx
import { FC, useContext, useEffect, useState } from 'react';
import { useGlobalAccount } from '@/hooks';
import { CreditsContext } from '@/context/creditsContext';
import { isCollaborator, isOwner } from '@/utils/user';
import { formatToCurrency } from '@/utils/formatBalance';
import * as Sentry from '@sentry/nextjs';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { Button } from '@/components/Button';
import { AccountInfoButton } from '@/components/AccountInfoButton';
import { cn } from '@/lib/utils';
import './CreditsWidget.css';

interface ICreditsWidgetProps {
  variant?: 'small' | 'large';
}

const DCX_IN_USD = 0.001;

export const CreditsWidget: FC<ICreditsWidgetProps> = ({ variant = 'small' }) => {
  const [dcxBalance, setDcxBalance] = useState<string>('$0.00');
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();
  const { setIsOpen } = useContext(CreditsContext);

  const loadAndFormatDcxBalance = async () => {
    try {
      if (isCollaborator(currentUser?.role ?? '')) return;
      const balance = await getCurrentDcxBalance();
      setDcxBalance(formatToCurrency(balance * DCX_IN_USD));
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error(error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    void loadAndFormatDcxBalance();
  }, [currentUser]);

  const handleBuyCredits = () => {
    if (isOwner(currentUser?.role ?? '')) {
      setIsOpen(true);
    }
  };

  if (variant === 'large') {
    return (
      <div className="credits-large">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <WalletIcon className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <div className="flex flex-row gap-2.5 items-center">
                <p className="text-4xl font-medium text-foreground">{dcxBalance}</p>
              </div>
              <p className="text-muted-foreground text-xs">Current Balance</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col w-full gap-2">
            <Button className="dark w-full" onClick={handleBuyCredits}>
              Buy Credits
            </Button>
            <AccountInfoButton variant="button" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="credits-display"
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10',
        'px-3 py-1 text-sm font-semibold text-muted-foreground',
      )}
    >
      <span className="text-primary text-xs">$</span>
      <span className="text-muted-foreground">{dcxBalance.replace('$', '')}</span>
      {isOwner(currentUser?.role ?? '') && (
        <button
          title="Add Credits"
          aria-label="Add Credits"
          className="ml-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
          onClick={handleBuyCredits}
          role="add-credits"
        >
          <PlusIcon className="h-3 w-3 text-primary" />
        </button>
      )}
    </div>
  );
};
```

Replace `src/components/CreditsWidget/CreditsWidget.css`:

```css
.credits-large {
  @apply p-4 rounded-xl flex flex-col bg-card border border-border;
}
```

- [ ] **Step 3: Run dev server and verify the header**

```bash
npm run dev
```

Verify:

- Header shows page title on left
- Right side: teal credits pill (shows `$12.40` style) → theme toggle → support button → account button
- No "DCX" text visible anywhere in the credits display

- [ ] **Step 4: Run tests and update snapshots**

```bash
npm test
npm run test:update-snap
npm test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header/Header.css src/components/CreditsWidget/
git commit -m "feat: redesign header credits as teal pill, show balance in USD"
```

---

## Task 6: shadcn Button Migration

**Files:**

- Run: `npx shadcn@latest add button`
- Modify: `src/components/Button/Button.tsx`
- Modify: `src/components/Button/Button.css`

- [ ] **Step 1: Add shadcn Button component**

```bash
npx shadcn@latest add button
```

This creates `src/components/ui/button.tsx`.

- [ ] **Step 2: Rewrite Button to wrap shadcn with existing variant API**

The goal is zero changes to call sites — existing `className` prop usage like `<Button className="dark">` keeps working.

Replace `src/components/Button/Button.tsx`:

```tsx
import React, {
  type ReactNode,
  type FC,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from 'react';
import { Button as ShadcnButton } from '@/components/ui/button';
import { BubbleLoader } from '@/components/BubbleLoader';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  className,
  loading = false,
  onClick = () => {},
  disabled,
  ...props
}) => {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!loading) onClick(e);
  };

  return (
    <ShadcnButton
      {...props}
      variant="default"
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn('button', className)}
    >
      {loading ? (
        <BubbleLoader isSmall isLoading />
      ) : (
        <span className="content">{children}</span>
      )}
    </ShadcnButton>
  );
};

export default Button;
```

- [ ] **Step 3: Update Button.css to use token classes**

Replace `src/components/Button/Button.css`:

```css
.button {
  @apply rounded-full h-10 font-medium inline-flex justify-center items-center px-4 gap-2
         border-2 border-transparent transition-colors
         disabled:opacity-50 disabled:cursor-not-allowed;

  span.content {
    @apply flex flex-row gap-1 items-center justify-center;
  }

  &.primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90;
  }

  &.primary-solid {
    @apply bg-primary text-primary-foreground;
  }

  &.rounded-sm {
    @apply rounded-xl;
  }

  &.primary-outline {
    @apply bg-transparent border-2 border-border text-foreground hover:border-primary;
  }

  &.white {
    @apply bg-card text-foreground;
    &-outline {
      @apply bg-transparent border border-border text-foreground;
    }
  }

  &.dark {
    @apply bg-accent text-foreground hover:border-border;
  }

  &.table-action-button {
    @apply bg-transparent text-foreground border border-border hover:border-primary;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
npm run test:update-snap
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Button/ src/components/ui/button.tsx
git commit -m "feat: migrate Button to shadcn/ui foundation"
```

---

## Task 7: Form Primitives Migration

**Files:**

- Run: `npx shadcn@latest add input textarea select switch checkbox label`
- Modify: `src/components/TextField/`
- Modify: `src/components/TextArea/`
- Modify: `src/components/SelectField/`
- Modify: `src/components/Toggle/`
- Modify: `src/components/CheckboxField/`

- [ ] **Step 1: Add shadcn form primitives**

```bash
npx shadcn@latest add input textarea select switch checkbox label
```

This creates files in `src/components/ui/`: `input.tsx`, `textarea.tsx`, `select.tsx`, `switch.tsx`, `checkbox.tsx`, `label.tsx`.

- [ ] **Step 2: Update TextField to use shadcn Input**

Find `src/components/TextField/TextField.tsx` (or `index.tsx`). Replace its rendered `<input>` element with the shadcn `Input`, keeping all existing props:

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface IProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, IProps>(
  ({ label, error, containerClassName, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          className={cn(error && 'border-destructive', className)}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
export default TextField;
```

Note: the existing `TextField` may have different props. Check the actual file first and adapt accordingly — the key change is replacing the internal `<input>` with `<Input>` from shadcn.

- [ ] **Step 3: Update TextArea**

In `src/components/TextArea/`, replace the rendered `<textarea>` with `<Textarea>` from `@/components/ui/textarea`. Keep all existing props and structure.

- [ ] **Step 4: Update Toggle to shadcn Switch**

In `src/components/Toggle/` (which renders a toggle/switch), replace the underlying implementation with shadcn `Switch`. The existing prop API (`checked`, `onChange`, `disabled`, `label`) is preserved — only the rendered element changes.

Example structure:

```tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const Toggle = ({ checked, onChange, label, disabled }) => (
  <div className="flex items-center gap-2">
    {label && <Label>{label}</Label>}
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);
```

- [ ] **Step 5: Update CheckboxField**

In `src/components/CheckboxField/`, replace with shadcn `Checkbox` + `Label`. Keep existing prop API.

- [ ] **Step 6: Update SelectField**

In `src/components/SelectField/`, replace with shadcn `Select`. The shadcn Select uses `SelectTrigger`, `SelectContent`, `SelectItem` from `@/components/ui/select`. Keep existing prop API (options array, value, onChange).

- [ ] **Step 7: Run full test suite**

```bash
npm test
npm run test:update-snap
npm test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/TextField/ src/components/TextArea/ src/components/SelectField/ src/components/Toggle/ src/components/CheckboxField/ src/components/ui/
git commit -m "feat: migrate form primitives to shadcn/ui (Input, Textarea, Select, Switch, Checkbox)"
```

---

## Task 8: Dialog + Table Migration

**Files:**

- Run: `npx shadcn@latest add dialog table`
- Modify: `src/components/Modal/Modal.tsx`
- Modify: `src/components/Modal/Modal.css`
- Modify: `src/components/Table/` (if it exists as a custom component)

- [ ] **Step 1: Add shadcn Dialog and Table**

```bash
npx shadcn@latest add dialog table
```

Creates `src/components/ui/dialog.tsx` and `src/components/ui/table.tsx`.

- [ ] **Step 2: Update Modal.tsx to use shadcn Dialog**

The existing `Modal` uses Headless UI's `Dialog`. Replace it with shadcn's `Dialog`, keeping the exact same props (`isOpen`, `setIsOpen`, `showClose`, `children`, `className`):

```tsx
'use client';

import { type FC, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface IProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
  className?: string;
  showClose?: boolean;
  children: ReactNode;
}

export const Modal: FC<IProps> = ({
  children,
  isOpen,
  setIsOpen,
  className,
  showClose = true,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={cn('dialog-panel', className)}>
        {showClose && (
          <DialogClose className="close-btn absolute right-4 top-4" aria-label="Close">
            <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          </DialogClose>
        )}
        <div className="dialog-content">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
```

- [ ] **Step 3: Update Modal.css to use token classes**

Replace `src/components/Modal/Modal.css`:

```css
.dialog-panel {
  @apply bg-card border border-border rounded-xl shadow-xl;
}

.close-btn {
  @apply text-muted-foreground hover:text-foreground transition-colors;
}

.dialog-content {
  @apply p-2;
}
```

- [ ] **Step 4: Update Table component (if custom)**

Check `src/components/Table/`. If it exists as a custom component that wraps TanStack Table, update only the markup layer to use shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` primitives from `@/components/ui/table`. The TanStack Table logic (column definitions, useReactTable, etc.) stays unchanged.

- [ ] **Step 5: Run tests**

```bash
npm test
npm run test:update-snap
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Modal/ src/components/Table/ src/components/ui/dialog.tsx src/components/ui/table.tsx
git commit -m "feat: migrate Modal to shadcn Dialog, Table to shadcn Table primitives"
```

---

## Task 9: Notification System → Sonner

**Files:**

- Run: `npx shadcn@latest add sonner`
- Modify: `src/layouts/RootLayout/RootLayout.tsx`
- Modify: `src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`
- Modify: `src/layouts/GuestLayout/GuestLayout.tsx`
- Modify: all files calling `setNotification` (search `useNotification` and `setNotification`)

- [ ] **Step 1: Add Sonner**

```bash
npx shadcn@latest add sonner
```

Creates `src/components/ui/sonner.tsx` which exports `<Toaster />`.

- [ ] **Step 2: Add Toaster to RootLayout**

In `src/layouts/RootLayout/RootLayout.tsx`, import and render `<Toaster />`:

```tsx
import { Toaster } from '@/components/ui/sonner';

// Inside the JSX, after <QueryProvider>:
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  <QueryProvider>{children}</QueryProvider>
  <Toaster position="bottom-right" />
</ThemeProvider>;
```

- [ ] **Step 3: Find all callers of setNotification**

```bash
grep -r "setNotification\|useNotification" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found, replace `setNotification({ status: 'success', message: '...' })` with the equivalent Sonner call:

| Old                                                      | New                    |
| -------------------------------------------------------- | ---------------------- |
| `setNotification({ status: 'success', message: 'Foo' })` | `toast.success('Foo')` |
| `setNotification({ status: 'error', message: 'Foo' })`   | `toast.error('Foo')`   |
| `setNotification({ status: 'loading', message: 'Foo' })` | `toast.loading('Foo')` |

Add `import { toast } from 'sonner';` to each file that calls toast.

Remove `const { setNotification } = useNotification();` and the `useNotification` import from each file.

- [ ] **Step 4: Remove withNotifications from HOC chains**

In `src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`, remove `withNotifications` from the `Providers` chain:

```tsx
const Providers = withGlobalAccounts(
  withLayout(
    withCredits(
      withApollo(
        withAccountInformation(({ children }: { children: React.ReactNode }) => (
          <>{children}</>
        )),
      ),
    ),
  ),
);
```

In `src/layouts/GuestLayout/GuestLayout.tsx`, remove `withNotifications` from its `Providers` chain similarly.

- [ ] **Step 5: Run dev server and trigger a notification to verify**

```bash
npm run dev
```

Perform any action that previously showed a toast (e.g. sign out, save a form). Verify the Sonner toast appears bottom-right with correct styling.

- [ ] **Step 6: Run tests**

```bash
npm test
npm run test:update-snap
npm test
```

- [ ] **Step 7: Commit**

```bash
git add src/layouts/ src/components/ui/sonner.tsx
git commit -m "feat: replace withNotifications HOC and Toast with Sonner"
```

---

## Task 10: AppCard Simplification + Token Cleanup

**Files:**

- Modify: `src/components/AppCard/AppCard.tsx`
- Modify: `src/components/AppCard/AppCard.css`
- Modify: `src/components/LicenseCard/` (update colors)
- Modify: `src/components/Card/` (if exists)
- Modify: `src/app/globals.css` (remove old body background override)
- Modify: any remaining hardcoded dark color classes site-wide

- [ ] **Step 1: Simplify AppCard — remove environment display**

Replace `src/components/AppCard/AppCard.tsx`:

```tsx
import { type FC } from 'react';
import { cn } from '@/lib/utils';
import { DeveloperBoardIcon } from '@/components/Icons';
import { IApp } from '@/types/app';
import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';
import './AppCard.css';

interface IProps extends Partial<IApp> {
  className?: string;
  description?: string;
  onClick?: () => void;
}

export const AppCard: FC<IProps> = ({ name, description = '', className = '', id }) => {
  return (
    <div className={cn('app-card', className)}>
      <div className="content">
        <div className="flex w-full flex-row justify-between items-center">
          <p className="title">{name}</p>
          <DeveloperBoardIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {description && <p className="app-card-description">{description}</p>}
        <Anchor href={`/app/details/${id}`}>
          <Button className="dark w-full !h-9">App Details</Button>
        </Anchor>
      </div>
    </div>
  );
};

export default AppCard;
```

Replace `src/components/AppCard/AppCard.css`:

```css
.app-card {
  @apply flex flex-row justify-between items-center bg-card border border-border rounded-xl p-4;

  .content {
    @apply flex flex-col gap-2 flex-1;

    .title {
      @apply text-sm font-bold text-foreground;
    }
  }
}

.app-card-description {
  @apply text-xs text-muted-foreground;
}
```

- [ ] **Step 2: Update LicenseCard colors**

In `src/components/LicenseCard/`, find hardcoded dark color classes (`bg-surface-*`, `text-white`, `text-grey-*`) and replace with token equivalents:

| Old class               | Replace with            |
| ----------------------- | ----------------------- |
| `bg-surface-default`    | `bg-card`               |
| `bg-surface-raised`     | `bg-accent`             |
| `bg-surface-sunken`     | `bg-background`         |
| `text-white`            | `text-foreground`       |
| `text-white/50`         | `text-muted-foreground` |
| `text-grey-200`         | `text-muted-foreground` |
| `border-surface-raised` | `border-border`         |

- [ ] **Step 3: Scan for remaining hardcoded dark color classes**

```bash
grep -r "bg-black\|bg-surface-\|text-white\b\|text-white/" src/ --include="*.tsx" --include="*.css" -l
```

For each file, replace with token equivalents using the same mapping as Step 2. Prioritize files that are rendered on every page (layouts, headers, cards).

- [ ] **Step 4: Run full test suite and update snapshots**

```bash
npm test
npm run test:update-snap
npm test
```

Expected: all pass.

- [ ] **Step 5: Run TypeScript check**

```bash
npm run compile
```

Expected: no errors.

- [ ] **Step 6: Run the app in both light and dark mode and do a full walkthrough**

```bash
npm run dev
```

Walk through these flows in both modes and verify nothing is broken:

1. Sign in page — logo, form fields, button
2. Home (app list) — welcome message, app cards
3. App details page
4. License page — license cards
5. Vehicles page — vehicle table
6. Connections page
7. Webhooks page
8. Settings page
9. Sidebar collapse/expand
10. Buy credits modal (CreditsWidget + button)
11. Any toast notification (trigger via a save/delete action)

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: simplify AppCard, replace hardcoded dark tokens with semantic classes"
```
