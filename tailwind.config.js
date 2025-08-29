/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hubcap: {
          bg: '#121212',
          text: '#FFFFFF',
          accent: '#F83400',
        }
      },
      fontFamily: {
        'outfit': ['var(--font-outfit)', 'sans-serif'],
      },
      fontWeight: {
        'normal': '400',
        'semibold': '600',
      }
    },
  },
  plugins: [],
}