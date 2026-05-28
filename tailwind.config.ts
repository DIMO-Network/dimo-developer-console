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
