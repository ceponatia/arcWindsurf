/**
 * Check if a node is a Zod method call (z.object, z.string, etc.).
 *
 * @param {import('estree').Node | null | undefined} node
 * @returns {boolean}
 */
function isZodSchemaCall(node) {
  if (!node) return false;

  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.object?.type === 'Identifier' &&
    node.callee.object.name === 'z'
  ) {
    return true;
  }

  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.object?.type === 'CallExpression'
  ) {
    return isZodSchemaCall(node.callee.object);
  }

  return false;
}

/**
 * Check if identifier name looks like a schema (ends with Schema).
 *
 * @param {string | undefined} name
 * @returns {boolean}
 */
function isSchemaName(name) {
  return Boolean(name && name.endsWith('Schema'));
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Exported Zod schemas must be defined in @minimal-rpg/schemas',
    },
    schema: [
      {
        type: 'object',
        properties: {
          repoRoot: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      schemaOutsidePackage:
        "Exported Zod schema '{{name}}' should be defined in @minimal-rpg/schemas. Create the schema there and import it here for local use.",
    },
  },
  /**
   * @param {import('eslint').Rule.RuleContext} context
   * @returns {import('eslint').Rule.RuleListener}
   */
  create(context) {
    const filename = context.filename;
    const isInSchemasPackage = filename.includes('/packages/schemas/');

    if (isInSchemasPackage) {
      return {};
    }

    return {
      /**
       * @param {import('estree').ExportNamedDeclaration} node
       * @returns {void}
       */
      ExportNamedDeclaration(node) {
        if (!node.declaration || node.declaration.type !== 'VariableDeclaration') return;

        for (const declarator of node.declaration.declarations) {
          if (declarator.id?.type !== 'Identifier') continue;

          const name = declarator.id.name;
          if (!isSchemaName(name)) continue;
          if (!isZodSchemaCall(declarator.init)) continue;

          context.report({
            node: declarator.id,
            messageId: 'schemaOutsidePackage',
            data: { name },
          });
        }
      },
    };
  },
};

export default rule;
