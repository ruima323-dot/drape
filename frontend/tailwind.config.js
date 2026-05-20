/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Quiet luxury palette
        cream: {
          50: '#FDFCFA',
          100: '#FAF7F2',
          200: '#F5F0E8',
          300: '#EDE5D8',
          400: '#E0D5C4',
        },
        charcoal: {
          DEFAULT: '#2D2D2D',
          light: '#4A4A4A',
          muted: '#6B6B6B',
        },
        gold: {
          DEFAULT: '#C9A96E',
          light: '#D4B87A',
          muted: '#B89B5E',
        },
        // Occasion context colors
        occasion: {
          work: '#64748B',        // slate
          'work-light': '#94A3B8',
          'work-bg': '#F1F5F9',
          casual: '#A3785A',      // warm earth
          'casual-light': '#C4A07A',
          'casual-bg': '#FDF6EE',
          night: '#6B21A8',       // deep purple
          'night-light': '#9333EA',
          'night-bg': '#F5F0FF',
          'night-gold': '#D4B87A',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'card-sm': '0.75rem',
        'card-md': '1rem',
        'card-lg': '1.5rem',
      },
      borderRadius: {
        card: '0.75rem',
        'card-lg': '1rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(45, 45, 45, 0.06), 0 1px 2px rgba(45, 45, 45, 0.04)',
        'card-hover': '0 4px 12px rgba(45, 45, 45, 0.08), 0 2px 4px rgba(45, 45, 45, 0.04)',
        'card-elevated': '0 8px 24px rgba(45, 45, 45, 0.1), 0 4px 8px rgba(45, 45, 45, 0.06)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translate(-50%, 12px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
