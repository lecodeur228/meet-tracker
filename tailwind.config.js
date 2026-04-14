/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontFamily: {
        neo: ['Space Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        neoB: '#000000',
        neoW: '#FFFFFF',
        neoPink: '#FF90E8',
        neoYellow: '#DDFF00',
        neoBlue: '#3240FF',
        neoGreen: '#00F000',
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-hover': '2px 2px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}