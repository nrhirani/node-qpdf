// eslint-disable-next-line node/no-unpublished-require
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: ["@sparticuz/eslint-config"],
  parserOptions: {
    ecmaVersion: 2021,
    project: "./tsconfig.json",
    sourceType: "module",
  },
  root: true,
  rules: {
    "dot-notation": "off",
    "no-console": "off",
  },
};
