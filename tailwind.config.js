/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./components/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        White: '#FFFFFF',
        Background: '#F7F7F7',
        Orange: '#C87711',
        LightOrange: '#F5C07B',
        Green: '#999933',
        Yellow: '#FFC000',
        LightGray: '#E6E6E6',
        DarkGray: '#CCCCCC',
      },
    },
  },
  plugins: [],
};
