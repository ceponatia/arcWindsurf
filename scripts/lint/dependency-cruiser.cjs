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
      severity: 'error',
      comment: 'utils should only depend on schemas',
      from: {
        path: '^packages/utils/',
      },
      to: {
        path: '^packages/(?!schemas|utils)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer2-no-higher-deps',
      severity: 'error',
      comment: 'layer 2 packages must not depend on higher layers',
      from: {
        path: '^packages/(db|bus|llm)/',
      },
      to: {
        path: '^packages/(generator|retrieval|projections|characters|services|actors|ui|api|web|workers)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer3-no-higher-deps',
      severity: 'error',
      comment: 'layer 3 packages must not depend on higher layers',
      from: {
        path: '^packages/(generator|retrieval|projections|characters)/',
      },
      to: {
        path: '^packages/(services|actors|ui|api|web|workers)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer4-no-higher-deps',
      severity: 'error',
      comment: 'services must not depend on higher layers',
      from: {
        path: '^packages/services/',
      },
      to: {
        path: '^packages/(actors|ui|api|web|workers)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer5-no-higher-deps',
      severity: 'error',
      comment: 'layer 5 packages must not depend on higher layers',
      from: {
        path: '^packages/(actors|ui)/',
      },
      to: {
        path: '^packages/(api|web|workers)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer2-no-same-level-db',
      severity: 'error',
      comment: 'db must not depend on same-layer packages',
      from: {
        path: '^packages/db/',
      },
      to: {
        path: '^packages/(bus|llm)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer2-no-same-level-bus',
      severity: 'error',
      comment: 'bus must not depend on same-layer packages',
      from: {
        path: '^packages/bus/',
      },
      to: {
        path: '^packages/(db|llm)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer2-no-same-level-llm',
      severity: 'error',
      comment: 'llm must not depend on same-layer packages',
      from: {
        path: '^packages/llm/',
      },
      to: {
        path: '^packages/(db|bus)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer3-no-same-level-generator',
      severity: 'error',
      comment: 'generator must not depend on same-layer packages',
      from: {
        path: '^packages/generator/',
      },
      to: {
        path: '^packages/(retrieval|projections|characters)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer3-no-same-level-retrieval',
      severity: 'error',
      comment: 'retrieval must not depend on same-layer packages',
      from: {
        path: '^packages/retrieval/',
      },
      to: {
        path: '^packages/(generator|projections|characters)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer3-no-same-level-projections',
      severity: 'error',
      comment: 'projections must not depend on same-layer packages',
      from: {
        path: '^packages/projections/',
      },
      to: {
        path: '^packages/(generator|retrieval|characters)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer3-no-same-level-characters',
      severity: 'error',
      comment: 'characters must not depend on same-layer packages',
      from: {
        path: '^packages/characters/',
      },
      to: {
        path: '^packages/(generator|retrieval|projections)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer5-no-same-level-actors',
      severity: 'error',
      comment: 'actors must not depend on same-layer packages',
      from: {
        path: '^packages/actors/',
      },
      to: {
        path: '^packages/ui/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer5-no-same-level-ui',
      severity: 'error',
      comment: 'ui must not depend on same-layer packages',
      from: {
        path: '^packages/ui/',
      },
      to: {
        path: '^packages/actors/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer6-no-same-level-api',
      severity: 'error',
      comment: 'api must not depend on same-layer packages',
      from: {
        path: '^packages/api/',
      },
      to: {
        path: '^packages/(web|workers)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer6-no-same-level-web',
      severity: 'error',
      comment: 'web must not depend on same-layer packages',
      from: {
        path: '^packages/web/',
      },
      to: {
        path: '^packages/(api|workers)/',
        pathNot: 'node_modules',
      },
    },
    {
      name: 'layer6-no-same-level-workers',
      severity: 'error',
      comment: 'workers must not depend on same-layer packages',
      from: {
        path: '^packages/workers/',
      },
      to: {
        path: '^packages/(api|web)/',
        pathNot: 'node_modules',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules|dist',
    },
    exclude: {
      path: ['(^|/)test/', '(^|/)dist/', '\\.test\\.ts$', '\\.spec\\.ts$'],
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
        /* Collapse every file under packages/<name> into one node per package */
        collapsePattern: [
          'packages/[^/]+',
          'node_modules/(@[^/]+/[^/]+|[^/]+)',
        ],
        theme: {
          graph: {
            rankdir: 'TB',
            splines: 'ortho',
            fontname: 'Helvetica Neue,Helvetica,Arial,sans-serif',
            fontsize: 14,
            ranksep: '1.0',
            nodesep: '0.8',
            bgcolor: '#fafafa',
          },
          node: {
            fontname: 'Helvetica Neue,Helvetica,Arial,sans-serif',
            fontsize: 11,
            shape: 'box',
            style: 'rounded,filled,bold',
            fillcolor: '#ffffcc',
            height: '0.4',
            penwidth: '2',
          },
          edge: {
            fontname: 'Helvetica Neue,Helvetica,Arial,sans-serif',
            fontsize: 9,
            arrowsize: '0.7',
            penwidth: '1.5',
          },
          modules: [
            /* Collapsed nodes use paths like 'packages/schemas' (no trailing slash) */
            {
              criteria: { source: 'packages/schemas$' },
              attributes: { fillcolor: '#d4edda', shape: 'octagon', color: '#28a745', fontcolor: '#155724' },
            },
            {
              criteria: { source: 'packages/utils$' },
              attributes: { fillcolor: '#cce5ff', shape: 'component', color: '#007bff', fontcolor: '#004085' },
            },
            {
              criteria: { source: 'packages/(db|bus|llm)$' },
              attributes: { fillcolor: '#fff3cd', shape: 'cylinder', color: '#ffc107', fontcolor: '#856404' },
            },
            {
              criteria: { source: 'packages/(generator|retrieval|projections|characters)$' },
              attributes: { fillcolor: '#f8d7da', shape: 'hexagon', color: '#dc3545', fontcolor: '#721c24' },
            },
            {
              criteria: { source: 'packages/services$' },
              attributes: { fillcolor: '#e2d5f1', shape: 'parallelogram', color: '#7b1fa2', fontcolor: '#4a148c' },
            },
            {
              criteria: { source: 'packages/(actors|ui)$' },
              attributes: { fillcolor: '#d1ecf1', shape: 'house', color: '#17a2b8', fontcolor: '#0c5460' },
            },
            {
              criteria: { source: 'packages/(api|web|workers)$' },
              attributes: { fillcolor: '#d6d8db', shape: 'doubleoctagon', color: '#6c757d', fontcolor: '#1b1e21' },
            },
          ],
        },
      },
    },
  },
};
