// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        bubble: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.01)" }, // grows in middle
        },
      },
      animation: {
        bubble: "bubble 1.8s ease-in-out infinite",
      },
    },
  },
};

