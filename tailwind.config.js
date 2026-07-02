/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b9fd',
          400: '#8199fb',
          500: '#6278f8',
          600: '#4a57ed',
          700: '#3b44d8',
          800: '#3139ae',
          900: '#2d3589',
          950: '#1c2054',
        },
        accent: {
          400: '#f59e0b',
          500: '#d97706',
        },
        surface: {
          900: '#0a0c1a',
          800: '#0f1127',
          700: '#161934',
          600: '#1e2340',
          500: '#252b4d',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px #6278f8, 0 0 20px #6278f8' },
          to:   { boxShadow: '0 0 20px #6278f8, 0 0 40px #6278f8, 0 0 60px #6278f8' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
