import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// Pre-refresh color names, pointed at the nearest new token so every page
// re-themes at once. Deleted in the palette-lock task; do not use in new code.
const legacyAliases = {
  surface: { default: token('sheet'), sunken: token('canvas'), raised: token('card') },
  cta: { default: token('control'), disabled: token('muted') },
  border: { disabled: token('outline') },
  text: { secondary: token('muted') },
  feedback: { success: token('positive'), error: token('negative') },
  ...Object.fromEntries(
    ['grey', 'dark-grey', 'dark'].map((ramp) => [
      ramp,
      {
        '50': token('fg'),
        '100': token('fg'),
        '200': token('muted'),
        '300': token('muted'),
        '400': token('muted'),
        '500': token('muted'),
        '600': token('muted'),
        '700': token('muted'),
        '800': token('outline'),
        '900': token('outline'),
        '950': token('outline'),
      },
    ]),
  ),
  primary: {
    '50': token('accent'),
    '100': token('accent'),
    '200': token('accent'),
    '300': token('accent'),
    '400': token('accent'),
    '500': token('accent-ink'),
    '600': token('accent-ink'),
    '700': token('accent-ink'),
    '800': token('accent-ink'),
    '900': token('accent-ink'),
    '950': token('accent-ink'),
  },
  red: {
    '50': token('negative'),
    '100': token('negative'),
    '200': token('negative'),
    '300': token('negative'),
    '400': token('negative'),
    '500': token('negative'),
    '600': token('negative'),
    '700': token('negative'),
    '800': token('negative-soft'),
    '900': token('negative-soft'),
    '950': token('negative-soft'),
  },
};

export const tokenColors = {
  'canvas': token('canvas'),
  'sheet': token('sheet'),
  'card': token('card'),
  'control': token('control'),
  'highest': token('highest'),
  'bright': token('bright'),
  'overlay': token('overlay'),
  'outline': token('outline'),
  'outline-strong': token('outline-strong'),
  'sheet-border': 'var(--sheet-border)',
  'ink': token('ink'),
  'fg': token('fg'),
  'muted': token('muted'),
  'accent': token('accent'),
  'accent-ink': token('accent-ink'),
  'on-accent': token('on-accent'),
  'accent-soft': 'var(--accent-soft)',
  'accent-soft-strong': 'var(--accent-soft-strong)',
  'selected': 'var(--selected)',
  'sky': token('sky'),
  'positive': token('positive'),
  'warning': token('warning'),
  'negative': token('negative'),
  'negative-soft': token('negative-soft'),
  'favorite': token('favorite'),
  'nav-hover': 'var(--nav-hover)',
  'nav-active': token('nav-active'),
  'scrim': 'var(--scrim)',
};

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: { ...legacyAliases, ...tokenColors },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'brand-gradient': 'var(--brand-gradient)',
        'brand-glow': 'var(--brand-glow)',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        sm: 'var(--shadow-sm)',
      },
      borderRadius: {
        chip: '6px',
        control: '10px',
        card: '16px',
        panel: '20px',
      },
      fontSize: {
        'title': [
          '20px',
          { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'card-title': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'panel-title': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'metric': [
          '40px',
          { lineHeight: '44px', letterSpacing: '-0.03em', fontWeight: '600' },
        ],
        'body': ['15px', { lineHeight: '22px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'code': ['13px', { lineHeight: '20px' }],
      },
      fontFamily: {
        sans: [
          'var(--font-dimo)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
