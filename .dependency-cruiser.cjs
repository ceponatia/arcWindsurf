/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies cause build issues and indicate tight coupling',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'schemas-no-internal-deps',
      severity: 'error',
      comment: 'schemas package must not depend on other internal packages',
      from: {
        path: '^packages/schemas/',
      },
      to: {
        path: '^packages/(?!schemas/)',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'utils-only-schemas',
      severity: 'warn',
      comment: 'utils should only depend on schemas',
      from: {
        path: '^packages/utils/',
      },
      to: {
        path: '^packages/(?!schemas|utils)/',
        pathNot: 'node_modules',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules|dist',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)',
      },
    },
  },
};
