import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff7ff",
          100: "#d9edff",
          200: "#b7dcff",
          300: "#89c4ff",
          400: "#54a8ff",
          500: "#1f8cff",
          600: "#1773d9",
          700: "#125ab0",
          800: "#0e468a",
          900: "#0b3a73",
        }
      },
      boxShadow: {
        soft: "0 2px 8px rgba(15, 23, 42, 0.06)",
        hover: "0 6px 16px rgba(15, 23, 42, 0.10)"
      },
      borderRadius: {
        'xl': '0.9rem',
        '2xl': '1.25rem'
      }
    },
  },
  plugins: [],
}
export default config
