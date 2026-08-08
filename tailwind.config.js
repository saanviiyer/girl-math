/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bubble: {
          50: '#fff1f7',
          100: '#ffe4ef',
          200: '#ffc9df',
          300: '#ff9fc6',
          400: '#ff66a3',
          500: '#ff3385',
          600: '#f01468',
          700: '#c80a52',
          800: '#a50c47',
          900: '#880f3f',
        },
      },
      fontFamily: {
        sans: ['ui-rounded', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
