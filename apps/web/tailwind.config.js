/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jade: {
          50: 'var(--jade-50)',
          100: 'var(--jade-100)',
          200: 'var(--jade-200)',
          // 300/950 were added for the landing's dark-water sections. A
          // long-running dev server can hold a stale copy of this config,
          // so landing components reference them as bg-[var(--jade-950)]
          // style arbitrary values rather than these tokens.
          300: 'var(--jade-300)',
          400: 'var(--jade-400)',
          600: 'var(--jade-600)',
          800: 'var(--jade-800)',
          900: 'var(--jade-900)',
          950: 'var(--jade-950)',
          DEFAULT: 'var(--jade-600)',
        },
        amber: {
          100: 'var(--amber-100)',
          500: 'var(--amber-500)',
          800: 'var(--amber-800)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          400: 'var(--ink-400)',
          300: 'var(--ink-300)',
          DEFAULT: 'var(--ink-900)',
        },
        paper: 'var(--paper)',
        white: 'var(--white)',
        line: {
          DEFAULT: 'var(--line)',
          soft: 'var(--line-soft)',
        },
        danger: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--info)',
        // Legacy aliases for untouched screens
        mist: 'var(--mist)',
        lacquer: 'var(--lacquer)',
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans Myanmar"', 'system-ui', 'sans-serif'],
        display: ['Sora', '"Noto Sans Myanmar"', 'system-ui', 'sans-serif'],
        myanmar: ['"Noto Sans Myanmar"', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
        '5xl': '96px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(16,22,19,0.04)',
        md: '0 4px 16px rgba(16,22,19,0.06)',
        lg: '0 16px 40px rgba(16,22,19,0.10)',
        focus: '0 0 0 3px rgba(14,130,86,0.16)',
      },
      maxWidth: {
        container: '1200px',
        hero: '560px',
        conversation: '620px',
        brief: '680px',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      lineHeight: {
        burmese: '1.8',
      },
    },
  },
  plugins: [],
};
