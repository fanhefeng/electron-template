export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "update", "refactor", "style", "docs", "test", "chore", "release", "revert"],
    ],
    "type-case": [2, "always", "lower-case"],
    "subject-max-length": [2, "always", 100],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 120],
  },
};
