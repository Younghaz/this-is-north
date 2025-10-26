import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

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
  plugins: [typography]
};

export default config;