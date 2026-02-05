import fs from 'node:fs';
import path from 'node:path';

import { globSync } from 'glob';
import ts from 'typescript';

import packageLayerBoundaries from './rules/package-layer-boundaries.mjs';
import schemasOnlyInSchemasPackage from './rules/schemas-only-in-schemas-package.mjs';

/**
 * @typedef {object} ExportedTypeDefinition
 * @property {string} name
 * @property {'type'|'interface'|'enum'} kind
 * @property {string} filePath
 * @property {string} packageName
 */

/**
 * @typedef {object} DuplicateTypeFinding
 * @property {string} name
 * @property {ExportedTypeDefinition[]} definitions
 */

/**
 * @param {ts.Node} node
 * @returns {boolean}
 */
function hasExportModifier(node) {
  const modifiers = /** @type {readonly ts.Modifier[] | undefined} */ (node.modifiers);
  return Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

/**
 * @param {string} repoRoot
 * @param {string} filePath
 * @returns {string | null}
 */
function getPackageName(repoRoot, filePath) {
  const rel = path.relative(repoRoot, filePath);
  const parts = rel.split(path.sep);
  if (parts.length >= 2 && parts[0] === 'packages') return parts[1] ?? null;
  return null;
}

/**
 * @param {string} filePath
 * @returns {ts.SourceFile}
 */
function parseSourceFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
}

/**
 * Extract exported type definitions (type aliases, interfaces, enums).
 *
 * @param {string} repoRoot
 * @param {string} filePath
 * @returns {ExportedTypeDefinition[]}
 */
function getExportedTypeDefinitions(repoRoot, filePath) {
  const packageName = getPackageName(repoRoot, filePath);
  if (!packageName) return [];

  const sourceFile = parseSourceFile(filePath);

  /** @type {ExportedTypeDefinition[]} */
  const defs = [];

  for (const statement of sourceFile.statements) {
    if (!hasExportModifier(statement)) continue;

    if (ts.isTypeAliasDeclaration(statement)) {
      defs.push({
        name: statement.name.text,
        kind: 'type',
        filePath,
        packageName,
      });
      continue;
    }

    if (ts.isInterfaceDeclaration(statement)) {
      defs.push({
        name: statement.name.text,
        kind: 'interface',
        filePath,
        packageName,
      });
      continue;
    }

    if (ts.isEnumDeclaration(statement)) {
      defs.push({
        name: statement.name.text,
        kind: 'enum',
        filePath,
        packageName,
      });
      continue;
    }
  }

  return defs;
}

/**
 * @param {string} repoRoot
 * @param {string[]} ignoreTypeNames
 * @returns {Map<string, DuplicateTypeFinding>}
 */
function scanDuplicateExportedTypes(repoRoot, ignoreTypeNames) {
  /**
   * Map: typeName -> packageName -> ExportedTypeDefinition[]
   * @type {Map<string, Map<string, ExportedTypeDefinition[]>>}
   */
  const byName = new Map();

  const files = globSync('packages/*/src/**/*.{ts,tsx}', {
    cwd: repoRoot,
    absolute: true,
  });

  for (const filePath of files) {
    const defs = getExportedTypeDefinitions(repoRoot, filePath);
    for (const def of defs) {
      if (ignoreTypeNames.includes(def.name)) continue;

      const perPackage = byName.get(def.name) ?? new Map();
      const existing = perPackage.get(def.packageName) ?? [];
      existing.push(def);
      perPackage.set(def.packageName, existing);
      byName.set(def.name, perPackage);
    }
  }

  /** @type {Map<string, DuplicateTypeFinding>} */
  const duplicates = new Map();

  for (const [name, perPackage] of byName.entries()) {
    if (perPackage.size <= 1) continue;

    /** @type {ExportedTypeDefinition[]} */
    const definitions = [];
    for (const defs of perPackage.values()) {
      definitions.push(...defs);
    }

    duplicates.set(name, { name, definitions });
  }

  return duplicates;
}

/**
 * Module-level cache so scanning happens once per ESLint process.
 *
 * Keyed by `${repoRoot}::${ignoreTypeNames.join(',')}`
 *
 * @type {Map<string, Map<string, DuplicateTypeFinding>>}
 */
const duplicateTypeCache = new Map();

/**
 * @param {string} repoRoot
 * @param {string[]} ignoreTypeNames
 * @returns {Map<string, DuplicateTypeFinding>}
 */
function getDuplicateTypes(repoRoot, ignoreTypeNames) {
  const cacheKey = `${repoRoot}::${ignoreTypeNames.join(',')}`;
  const cached = duplicateTypeCache.get(cacheKey);
  if (cached) return cached;

  const scanned = scanDuplicateExportedTypes(repoRoot, ignoreTypeNames);
  duplicateTypeCache.set(cacheKey, scanned);
  return scanned;
}

/**
 * @type {import('eslint').ESLint.Plugin}
 */
const plugin = {
  rules: {
    /**
     * Detects exported type/interface/enum definitions that share the same name across multiple packages.
     *
     * This is intentionally cross-package: even when linting a single package (e.g. `packages/api`),
     * it scans all `packages/<package>/src` TypeScript files from the repo root and reports duplicates
     * found in the currently-linted file.
     */
    'no-duplicate-exported-types': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow exporting type/interface/enum definitions with the same name from multiple packages',
        },
        schema: [
          {
            type: 'object',
            properties: {
              repoRoot: { type: 'string' },
              ignoreTypeNames: { type: 'array', items: { type: 'string' }, default: [] },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          duplicate:
            "Exported {{kind}} '{{name}}' is also defined in other packages: {{others}}. Canonicalize in @minimal-rpg/schemas and derive package-specific variants via Pick/Omit.",
        },
      },
      create(context) {
        const filename = context.filename;
        if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) return {};

        const options = (context.options && context.options[0]) || {};
        const repoRoot = typeof options.repoRoot === 'string' ? options.repoRoot : process.cwd();
        const ignoreTypeNames = Array.isArray(options.ignoreTypeNames) ? options.ignoreTypeNames : [];

        const duplicates = getDuplicateTypes(repoRoot, ignoreTypeNames);
        const currentPackage = getPackageName(repoRoot, filename);

        if (!currentPackage) return {};

        /**
         * @param {any} node
         * @returns {node is import('estree').ExportNamedDeclaration}
         */
        function isExportNamedDeclaration(node) {
          return node && node.type === 'ExportNamedDeclaration';
        }

        return {
          Program() {
            const ast = context.getSourceCode().ast;

            for (const statement of ast.body) {
              if (!isExportNamedDeclaration(statement)) continue;
              if (!statement.declaration) continue;

              const decl = statement.declaration;
              const isTypeAlias = decl.type === 'TSTypeAliasDeclaration';
              const isInterface = decl.type === 'TSInterfaceDeclaration';
              const isEnum = decl.type === 'TSEnumDeclaration';
              if (!isTypeAlias && !isInterface && !isEnum) continue;

              const id = decl.id;
              if (!id || id.type !== 'Identifier') continue;

              const name = id.name;
              const finding = duplicates.get(name);
              if (!finding) continue;

              const others = finding.definitions
                .filter((d) => d.packageName !== currentPackage)
                .map((d) => `${d.packageName} (${path.relative(repoRoot, d.filePath)})`);

              if (others.length === 0) continue;

              context.report({
                node: id,
                messageId: 'duplicate',
                data: {
                  kind: isTypeAlias ? 'type' : isInterface ? 'interface' : 'enum',
                  name,
                  others: others.join(', '),
                },
              });
            }
          },
        };
      },
    },
    'package-layer-boundaries': packageLayerBoundaries,
    'schemas-only-in-schemas-package': schemasOnlyInSchemasPackage,
  },
};

export default plugin;
