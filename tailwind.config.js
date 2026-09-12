/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf4',
          100: '#dcf5e4',
          200: '#bbebcb',
          300: '#89d9a8',
          400: '#52be7f',
          500: '#2d9e5f',
          600: '#1e7d48',
          700: '#1a6339',
          800: '#184f30',
          900: '#154128',
          950: '#0b2416',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        earth: {
          50:  '#faf7f0',
          100: '#f0e9d6',
          200: '#e0d0aa',
          500: '#8b6914',
          800: '#3d2e08',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"IBM Plex Sans Arabic"', '"Source Sans 3"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'green': '0 4px 24px rgba(29, 122, 72, 0.15)',
        'green-lg': '0 8px 40px rgba(29, 122, 72, 0.22)',
        'card': '0 2px 12px rgba(0,0,0,0.06)',
        'card-lg': '0 6px 32px rgba(0,0,0,0.10)',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease-out both',
        'slide-up':  'slideUp 0.4s ease-out both',
        'slide-in':  'slideIn 0.35s ease-out both',
        'pulse-slow':'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: {opacity:'0'}, to: {opacity:'1'} },
        slideUp: { from: {opacity:'0',transform:'translateY(16px)'}, to: {opacity:'1',transform:'translateY(0)'} },
        slideIn: { from: {opacity:'0',transform:'translateX(-12px)'}, to: {opacity:'1',transform:'translateX(0)'} },
      },
    },
  },
  plugins: [],
};
