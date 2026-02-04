/**
 * @typedef {Record<string, number>} PackageLayerMap
 */

/** @type {PackageLayerMap} */
const packageLayers = {
  schemas: 0,
  utils: 1,
  db: 2,
  bus: 2,
  llm: 2,
  generator: 3,
  retrieval: 3,
  projections: 3,
  characters: 3,
  services: 4,
  actors: 5,
  ui: 5,
  api: 6,
  web: 6,
  workers: 6,
};

/**
 * @param {string} filePath
 * @returns {string | null}
 */
function getPackageFromPath(filePath) {
  const match = filePath.match(/packages\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * @param {string} importPath
 * @returns {string | null}
 */
function parseMinimalRpgImport(importPath) {
  const match = importPath.match(/^@minimal-rpg\/([^/]+)/);
  return match ? match[1] : null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce package layer boundaries - lower layers cannot import from higher layers',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowSameLevel: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      layerViolation:
        "Package '{{currentPkg}}' (layer {{currentLayer}}) cannot import from '{{importedPkg}}' (layer {{importedLayer}}). Lower layers cannot depend on higher layers.",
    },
  },
  /**
   * @param {import('eslint').Rule.RuleContext} context
   * @returns {import('eslint').Rule.RuleListener}
   */
  create(context) {
    const options = context.options[0] || {};
    const allowSameLevel = options.allowSameLevel !== false;
    const currentPackage = getPackageFromPath(context.filename);

    if (!currentPackage || !(currentPackage in packageLayers)) {
      return {};
    }

    const currentLayer = packageLayers[currentPackage];

    return {
      /**
       * @param {import('estree').ImportDeclaration} node
       * @returns {void}
       */
      ImportDeclaration(node) {
        const importPath = node.source.value;
        if (typeof importPath !== 'string') return;

        const importedPackage = parseMinimalRpgImport(importPath);

        if (!importedPackage || !(importedPackage in packageLayers)) {
          return;
        }

        const importedLayer = packageLayers[importedPackage];

        if (importedLayer > currentLayer || (!allowSameLevel && importedLayer === currentLayer)) {
          context.report({
            node: node.source,
            messageId: 'layerViolation',
            data: {
              currentPkg: currentPackage,
              currentLayer,
              importedPkg: importedPackage,
              importedLayer,
            },
          });
        }
      },
    };
  },
};

export default rule;
