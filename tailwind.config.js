/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [ "./views/**/*.ejs", "./node_modules/tw-elements/dist/js/**/*.js"],
  plugins: [
    require("tw-elements/dist/plugin")
  ]
};
