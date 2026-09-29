import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

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
  'canvas-divider': token('canvas-divider'),
  'control-border': token('control-border'),
  'control-border-hover': token('control-border-hover'),
  'focus-ring': token('focus-ring'),
  'sheet-border': 'var(--sheet-border)',
  'ink': token('ink'),
  'fg': token('fg'),
  'muted': token('muted'),
  'accent': token('accent'),
  'accent-ink': token('accent-ink'),
  'on-accent': token('on-accent'),
  'accent-soft': 'var(--accent-soft)',
  'accent-soft-strong': 'var(--accent-soft-strong)',
  'selected-bg': token('selected-bg'),
  'selected-fg': token('selected-fg'),
  'btn-primary': token('btn-primary'),
  'btn-primary-fg': token('btn-primary-fg'),
  'btn-primary-hover': token('btn-primary-hover'),
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
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...tokenColors,
    },
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'brand-gradient': 'var(--brand-gradient)',
        'brand-glow': 'var(--brand-glow)',
        'progress-fill': 'var(--progress-fill)',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        sm: 'var(--shadow-sm)',
        // Selected card / row: an ink edge on a neutral fill (never a tint).
        selected: 'inset 3px 0 0 rgb(var(--ink))',
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
