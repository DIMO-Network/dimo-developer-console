import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        gray: {
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
        'dark-grey': {
          '50': '#f7f8f8',
          '100': '#edeef1',
          '200': '#d8dbdf',
          '300': '#b5bac4',
          '400': '#8d94a3',
          '500': '#6f7788',
          '600': '#596070',
          '700': '#494f5b',
          '800': '#3f434d',
          '900': '#373b43',
          '950': '#131417',
        },
      },
    },
  },
  plugins: [],
};
export default config;
