/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        accent: {
          50: '#effaf8',
          100: '#d7f1ec',
          200: '#b0e2d9',
          500: '#16897b',
          600: '#0f7266',
          700: '#0d5c53',
          800: '#0c4a43',
        },
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
