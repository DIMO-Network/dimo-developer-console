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

const primaryScale = {
  '50': 'rgb(var(--accent) / <alpha-value>)',
  '100': 'rgb(var(--accent) / <alpha-value>)',
  '200': 'rgb(var(--accent) / <alpha-value>)',
  '300': 'rgb(var(--accent) / <alpha-value>)',
  '400': 'rgb(var(--accent) / <alpha-value>)',
  '500': 'rgb(var(--accent-ink) / <alpha-value>)',
  '600': 'rgb(var(--accent-ink) / <alpha-value>)',
  '700': 'rgb(var(--accent-ink) / <alpha-value>)',
  '800': 'rgb(var(--accent-ink) / <alpha-value>)',
  '900': 'rgb(var(--accent-ink) / <alpha-value>)',
  '950': 'rgb(var(--accent-ink) / <alpha-value>)',
};

// Ramp aliases: 50-100 fg, 200-700 muted, 800-950 outline.
const neutralRamp = {
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
};

const redRamp = {
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
};

/*
 * Ruling 2 aliases. shadcn names whose meaning matches a Fleet token stay;
 * the legacy names are TEMPORARY and map onto the nearest Fleet token so
 * unmigrated pages keep compiling. The final task deletes them.
 */
const aliasColors = {
  // shadcn aliases (permanent)
  'background': token('sheet'),
  'foreground': token('fg'),
  'popover': { DEFAULT: token('overlay'), foreground: token('fg') },
  'sidebar': token('canvas'),
  'border': token('outline'),
  'input': token('control-border'),
  'ring': token('focus-ring'),
  'destructive': { DEFAULT: token('negative'), foreground: token('fg') },
  // legacy (temporary)
  'primary': {
    DEFAULT: token('accent'),
    foreground: token('on-accent'),
    ...primaryScale,
  },
  'primary-scale': primaryScale,
  'secondary': { DEFAULT: token('control'), foreground: token('fg') },
  'surface': {
    default: token('sheet'),
    sunken: token('canvas'),
    raised: token('card'),
  },
  'cta': { default: token('control'), disabled: token('muted') },
  'feedback': { success: token('positive'), error: token('negative') },
  'text': { secondary: token('muted') },
  'grey': neutralRamp,
  'dark-grey': neutralRamp,
  'dark': neutralRamp,
  'red': redRamp,
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
      colors: {
        ...tokenColors,
        ...aliasColors,
        card: { DEFAULT: token('card'), foreground: token('fg') },
        muted: { DEFAULT: token('muted'), foreground: token('muted') },
        accent: {
          'DEFAULT': token('accent'),
          'foreground': token('on-accent'),
          'ink': token('accent-ink'),
          'soft': 'var(--accent-soft)',
          'soft-strong': 'var(--accent-soft-strong)',
        },
      },
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
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
