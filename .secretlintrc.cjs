/** @type {import('secretlint').SecretLintConfigDescriptor} */
module.exports = {
  rules: [
    {
      id: '@secretlint/secretlint-rule-preset-recommend',
    },
  ],
  // Don’t scan build outputs or dependencies.
  ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'],
};
