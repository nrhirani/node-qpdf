// eslint-disable-next-line import/no-extraneous-dependencies, n/no-unpublished-require
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
  extends: ["@sparticuz/eslint-config"],
  parserOptions: {
    ecmaVersion: 2022,
    project: "./tsconfig.json",
    sourceType: "module",
  },
  root: true,
  rules: {
    "dot-notation": "off",
    "no-console": "off",
  },
};
