/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a3a52',
        secondary: '#d4af37',
        accent: '#2c5aa0',
        lightbg: '#f8f6f1',
      }
    }
  },
  plugins: [],
};
