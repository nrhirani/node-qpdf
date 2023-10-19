/** @type {import("prettier").Config} */
/** @type {import("@ianvs/prettier-plugin-sort-imports").PrettierConfig} */
const config = {
  importOrder: [
    "",
    "<BUILTIN_MODULES>",
    "",
    "react",
    "",
    "^(@dazser|@sparticuz)/(.*)$",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/(.*)$",
    "",
    "",
    "^[.]",
    "",
    ".json$",
    "^(?!.*[.]css$)[./].*$",
    ".css$",
  ],
  importOrderParserPlugins: [
    "classProperties",
    "decorators-legacy",
    "importAssertions",
    "jsx",
    "typescript",
  ],
  importOrderTypeScriptVersion: "5.2.2",
  // eslint-disable-next-line n/no-unpublished-require
  plugins: [require.resolve("@ianvs/prettier-plugin-sort-imports")],
};
module.exports = config;
