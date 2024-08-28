import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "appear-change-green": {
          "0%": {
            transform: "translateX(100%)",
            backgroundColor: "white",
            opacity: "0",
          },
          "33%": {
            transform: "translateX(0)",
            backgroundColor: "white",
            opacity: "1",
          },
          "66%": {
            transform: "translateX(0)",
            backgroundColor: "green",
            opacity: "1",
          },
          "100%": {
            transform: "translateX(100%)",
            backgroundColor: "green",
            opacity: "0",
          },
        },
        "appear-change-red": {
          "0%": {
            transform: "translateX(-100%)",
            backgroundColor: "white",
            opacity: "0",
          },
          "33%": {
            transform: "translateX(0)",
            backgroundColor: "white",
            opacity: "1",
          },
          "66%": {
            transform: "translateX(0)",
            backgroundColor: "red",
            opacity: "1",
          },
          "100%": {
            transform: "translateX(-100%)",
            backgroundColor: "red",
            opacity: "0",
          },
        },
      },
      animation: {
        "appear-change-green": "appear-change-green 3s infinite",
        "appear-change-red": "appear-change-red 3s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
