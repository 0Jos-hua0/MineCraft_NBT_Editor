/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.js",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        minecraft: {
          bg: '#121212',       // Void Dark
          panel: '#1e1e1e',    // Slightly lighter panel
          border: '#3a3a3a',
          accent: '#3b8526',   // Minecraft Green
          accentHover: '#4ca532',
          text: '#e0e0e0',
          subtext: '#a0a0a0',
          value: '#55ff55',    // Classic green text
          key: '#55ffff',      // Cyan text
          warning: '#ff5555',  // Red warning
        }
      },
      fontFamily: {
        pixel: ['"VT323"', 'monospace'],
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}
