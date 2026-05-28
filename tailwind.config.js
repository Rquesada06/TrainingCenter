// tailwind.config.js
// Source: https://www.nativewind.dev/docs/getting-started/installation
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Obsidian Performance design system
        base: '#0E0E0E',
        accent: '#00FF66',
        surface: '#1A1A1A',
        muted: '#444444',
        text: {
          primary: '#FFFFFF',
          secondary: '#888888',
        },
      },
      fontFamily: {
        sans: ['HankenGrotesk-Regular'],
        mono: ['JetBrainsMono-Regular'],
      },
    },
  },
  plugins: [],
};
