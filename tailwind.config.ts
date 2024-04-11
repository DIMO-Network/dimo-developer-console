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
          '50': '#f4f6f7',
          '100': '#e3e8ea',
          '200': '#c9d2d8',
          '300': '#a4b3bc',
          '400': '#778c99',
          '500': '#5c707e',
          '600': '#4f5f6b',
          '700': '#444f5a',
          '800': '#3d454d',
          '900': '#363c43',
          '950': '#24292f',
        },
        primary: {
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
      },
    },
  },
  plugins: [],
};
export default config;
