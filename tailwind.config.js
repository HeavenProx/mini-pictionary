/** @type {import('tailwindcss').Config} */
module.exports = {
  // (optionnel en v4, mais ok de le laisser)
  content: [
    "./src/app/**/*.{js,jsx,mdx}",
    "./src/components/**/*.{js,jsx,mdx}",
    "./src/pages/**/*.{js,jsx,mdx}",
  ],
  theme: { extend: {} },
  plugins: [require("daisyui")],
  daisyui: { themes: ["light", "dark", "pastel"] },
}
