import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1FA34A',
          dark: '#15803d',
          light: '#86efac'
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;