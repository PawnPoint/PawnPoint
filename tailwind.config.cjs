/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#ec4899",
          purple: "#8b5cf6",
          green: "#34d399",
          dark: "#0b1220"
        }
      },
      borderRadius: {
        xl: "1.25rem"
      },
      boxShadow: {
        glow: "0 10px 40px rgba(236, 72, 153, 0.35)"
      }
    }
  },
  plugins: []
};
