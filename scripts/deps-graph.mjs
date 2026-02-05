#!/usr/bin/env node

/**
 * Generates a layered dependency graph of workspace packages as DOT/SVG.
 *
 * Usage:
 *   node scripts/deps-graph.mjs              # writes dependency-graph.svg
 *   node scripts/deps-graph.mjs --format dot # writes DOT to stdout
 *   node scripts/deps-graph.mjs --format svg # writes dependency-graph.svg (default)
 *   node scripts/deps-graph.mjs --format png # writes dependency-graph.png
 *
 * Requires `dot` (graphviz) for SVG/PNG output.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, 'packages');

// ---------------------------------------------------------------------------
// Architecture layers - order matters (bottom = foundation, top = entry points)
// ---------------------------------------------------------------------------

/** @type {Array<{ name: string; label: string; packages: string[]; color: string; gradientFrom: string; gradientTo: string; fontColor: string; shape: string; borderColor: string; description: string }>} */
const LAYERS = [
  {
    name: 'layer0',
    label: 'Layer 0 - Foundation',
    packages: ['schemas'],
    color: '#d4edda',
    gradientFrom: '#e7f6eb',
    gradientTo: '#c4e3ce',
    fontColor: '#155724',
    shape: 'octagon',
    borderColor: '#28a745',
    description: 'Shared Zod schemas, zero internal deps',
  },
  {
    name: 'layer1',
    label: 'Layer 1 - Utilities',
    packages: ['utils'],
    color: '#cce5ff',
    gradientFrom: '#e1f0ff',
    gradientTo: '#b7d7ff',
    fontColor: '#004085',
    shape: 'component',
    borderColor: '#007bff',
    description: 'Pure helpers, depends only on schemas',
  },
  {
    name: 'layer2',
    label: 'Layer 2 - Infrastructure',
    packages: ['db', 'bus', 'llm'],
    color: '#fff3cd',
    gradientFrom: '#fff8e2',
    gradientTo: '#ffe8a6',
    fontColor: '#856404',
    shape: 'cylinder',
    borderColor: '#ffc107',
    description: 'DB, messaging, LLM adapters',
  },
  {
    name: 'layer3',
    label: 'Layer 3 - Domain',
    packages: ['generator', 'retrieval', 'projections', 'characters'],
    color: '#f8d7da',
    gradientFrom: '#fde6e8',
    gradientTo: '#f3c4c9',
    fontColor: '#721c24',
    shape: 'hexagon',
    borderColor: '#dc3545',
    description: 'Domain logic and data access',
  },
  {
    name: 'layer4',
    label: 'Layer 4 - Orchestration',
    packages: ['services'],
    color: '#e2d5f1',
    gradientFrom: '#efe6fa',
    gradientTo: '#d3c0ea',
    fontColor: '#4a148c',
    shape: 'parallelogram',
    borderColor: '#7b1fa2',
    description: 'Cross-cutting service composition',
  },
  {
    name: 'layer5',
    label: 'Layer 5 - Agents & Presentation',
    packages: ['actors', 'ui'],
    color: '#d1ecf1',
    gradientFrom: '#e6f5f8',
    gradientTo: '#bfe0e6',
    fontColor: '#0c5460',
    shape: 'house',
    borderColor: '#17a2b8',
    description: 'AI actors and UI component library',
    // Note: & is escaped to &amp; in generateDot for HTML labels
  },
  {
    name: 'layer6',
    label: 'Layer 6 - Entry Points',
    packages: ['api', 'web', 'workers'],
    color: '#d6d8db',
    gradientFrom: '#eceeef',
    gradientTo: '#c1c4c8',
    fontColor: '#1b1e21',
    shape: 'doubleoctagon',
    borderColor: '#6c757d',
    description: 'Deployable applications',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads and parses a JSON file.
 * @param {string} filePath - Path to JSON file
 * @returns {Record<string, unknown>}
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Checks whether a file or directory exists.
 * @param {string} p - Path to check
 * @returns {boolean}
 */
function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the short directory name for a package, or null if unknown.
 * @param {string} fullName - e.g. "@minimal-rpg/schemas"
 * @param {Map<string, string>} nameToDir
 * @returns {string | null}
 */
function dirFromName(fullName, nameToDir) {
  return nameToDir.get(fullName) ?? null;
}

/**
 * Loads a map of package name -> directory name for all workspace packages.
 * @returns {Map<string, string>}
 */
function loadPackagesMap() {
  const map = new Map();
  if (!exists(PACKAGES_DIR)) return map;

  const dirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!exists(pkgPath)) continue;
    const pkg = readJson(pkgPath);
    if (pkg?.name) map.set(/** @type {string} */(pkg.name), dir);
  }
  return map;
}

/**
 * Gets workspace dependencies for a single package.
 * @param {Record<string, unknown>} pkgJson
 * @returns {string[]} - Array of workspace dependency names
 */
function getWorkspaceDeps(pkgJson) {
  const deps = {
    .../** @type {Record<string, string>} */ (pkgJson.dependencies ?? {}),
    .../** @type {Record<string, string>} */ (pkgJson.devDependencies ?? {}),
    .../** @type {Record<string, string>} */ (pkgJson.peerDependencies ?? {}),
  };
  return Object.entries(deps)
    .filter(([, v]) => typeof v === 'string' && v.startsWith('workspace:'))
    .map(([name]) => name);
}

/**
 * Builds the full dependency graph as { dirName -> [depDirName, ...] }.
 * @param {Map<string, string>} nameToDir
 * @returns {Map<string, string[]>}
 */
function buildGraph(nameToDir) {
  /** @type {Map<string, string[]>} */
  const graph = new Map();

  for (const [name, dir] of nameToDir.entries()) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    const pkg = readJson(pkgPath);
    const wsDeps = getWorkspaceDeps(pkg);
    const depDirs = wsDeps
      .map((depName) => dirFromName(depName, nameToDir))
      .filter(/** @returns {d is string} */(d) => d !== null);
    graph.set(dir, depDirs);
  }
  return graph;
}

/**
 * Finds the layer definition for a given package directory.
 * @param {string} dir
 * @returns {(typeof LAYERS)[number] | undefined}
 */
function layerForPackage(dir) {
  return LAYERS.find((l) => l.packages.includes(dir));
}

// ---------------------------------------------------------------------------
// Graph edge classification
// ---------------------------------------------------------------------------

/**
 * Classifies an edge as 'downward' (allowed), 'same-layer', or 'upward' (violation).
 * @param {string} from
 * @param {string} to
 * @returns {'downward' | 'same-layer' | 'upward'}
 */
function classifyEdge(from, to) {
  const fromIdx = LAYERS.findIndex((l) => l.packages.includes(from));
  const toIdx = LAYERS.findIndex((l) => l.packages.includes(to));
  if (fromIdx === -1 || toIdx === -1) return 'downward';
  if (fromIdx === toIdx) return 'same-layer';
  return fromIdx > toIdx ? 'downward' : 'upward';
}

// ---------------------------------------------------------------------------
// DOT generation
// ---------------------------------------------------------------------------

/**
 * Generates DOT source for the dependency graph.
 * @param {Map<string, string[]>} graph
 * @returns {string}
 */
function generateDot(graph) {
  const lines = [];

  lines.push('digraph "Minimal RPG - Workspace Dependency Graph" {');
  lines.push('  // Global settings');
  lines.push('  graph [');
  lines.push('    rankdir=TB');
  lines.push('    newrank=true');
  lines.push('    splines=curved');
  lines.push('    concentrate=true');
  lines.push('    overlap=false');
  lines.push('    nodesep=0.45');
  lines.push('    esep=0.2');
  lines.push('    sep=0.2');
  lines.push('    ranksep="1.0 equally"');
  lines.push('    fontname="Helvetica Neue,Helvetica,Arial,sans-serif"');
  lines.push('    fontsize=14');
  lines.push('    bgcolor="#fafafa"');
  lines.push('    pad="0.5,0.5"');
  lines.push('    label=<<font point-size="20"><b>Minimal RPG - Package Architecture</b></font><br/><font point-size="11" color="#666666">Arrows point from dependent to dependency (downward = correct)</font>>');
  lines.push('    labelloc=t');
  lines.push('    labeljust=c');
  lines.push('  ]');
  lines.push('');
  lines.push('  node [');
  lines.push('    fontname="Helvetica Neue,Helvetica,Arial,sans-serif"');
  lines.push('    fontsize=11');
  lines.push('    style="filled,bold"');
  lines.push('    penwidth=2');
  lines.push('    margin="0.2,0.1"');
  lines.push('  ]');
  lines.push('');
  lines.push('  edge [');
  lines.push('    fontname="Helvetica Neue,Helvetica,Arial,sans-serif"');
  lines.push('    fontsize=9');
  lines.push('    arrowsize=0.7');
  lines.push('    penwidth=1.6');
  lines.push('    minlen=2');
  lines.push('    weight=2');
  lines.push('  ]');
  lines.push('');

  // Emit layer subgraphs (clusters) - in reverse order so layer 0 is at bottom
  // Track one anchor node per layer to chain ranks with invisible edges
  /** @type {string[]} */
  const layerAnchors = [];

  for (let i = LAYERS.length - 1; i >= 0; i--) {
    const layer = LAYERS[i];
    const packagesInGraph = layer.packages.filter((p) => graph.has(p));
    if (packagesInGraph.length === 0) continue;

    lines.push(`  // ${layer.label}`);
    lines.push(`  subgraph cluster_${layer.name} {`);
    const safeLabel = layer.label.replace(/&/g, '&amp;');
    const safeDesc = layer.description.replace(/&/g, '&amp;');
    lines.push(`    label=<<font point-size="12"><b>${safeLabel}</b></font><br/><font point-size="9" color="#888888">${safeDesc}</font>>`);
    lines.push(`    style="rounded,filled"`);
    lines.push(`    fillcolor="${layer.color}40"`);
    lines.push(`    color="${layer.borderColor}"`);
    lines.push(`    penwidth=2`);
    lines.push(`    fontname="Helvetica Neue,Helvetica,Arial,sans-serif"`);
    lines.push(`    fontsize=12`);
    lines.push(`    margin=16`);
    lines.push('');

    for (const pkg of packagesInGraph) {
      const depCount = graph.get(pkg)?.length ?? 0;
      const dependentCount = [...graph.values()].filter((deps) => deps.includes(pkg)).length;
      const tooltip = `${pkg}\\n${depCount} dependencies, ${dependentCount} dependents`;

      lines.push(`    "${pkg}" [`);
      lines.push(`      label=<<b>${pkg}</b>>`);
      lines.push(`      shape=${layer.shape}`);
      lines.push(`      fillcolor="${layer.gradientFrom}:${layer.gradientTo}"`);
      lines.push('      gradientangle=90');
      lines.push(`      color="${layer.borderColor}"`);
      lines.push(`      fontcolor="${layer.fontColor}"`);
      lines.push(`      tooltip="${tooltip}"`);
      lines.push('    ]');
    }

    lines.push('  }');
    lines.push('');

    // Record first package in this layer as anchor for rank chaining
    layerAnchors.push(packagesInGraph[0]);
  }

  // Force vertical layer ordering with invisible edges between layer anchors
  if (layerAnchors.length > 1) {
    lines.push('  // Invisible rank-ordering edges to enforce vertical layer stacking');
    for (let i = 0; i < layerAnchors.length - 1; i++) {
      lines.push(`  "${layerAnchors[i]}" -> "${layerAnchors[i + 1]}" [style=invis weight=100]`);
    }
    lines.push('');
  }

  // Enforce same rank for packages within each layer
  lines.push('  // Rank constraints per layer');
  for (const layer of LAYERS) {
    const packagesInGraph = layer.packages.filter((p) => graph.has(p));
    if (packagesInGraph.length > 1) {
      const nodeList = packagesInGraph.map((p) => `"${p}"`).join(' ');
      lines.push(`  { rank=same ${nodeList} }`);
    }
  }
  lines.push('');

  // Emit edges - colored by source package's layer
  lines.push('  // Dependencies');
  const allDirs = [...graph.keys()].sort();
  for (const dir of allDirs) {
    const deps = graph.get(dir) ?? [];
    const sourceLayer = layerForPackage(dir);
    const sourceGradientFrom = sourceLayer?.gradientFrom ?? '#cccccc';
    const sourceGradientTo = sourceLayer?.gradientTo ?? '#999999';
    const sourceColor = `${sourceGradientFrom}:${sourceGradientTo}`;

    for (const dep of deps.sort()) {
      const edgeType = classifyEdge(dir, dep);

      let edgeAttrs;
      switch (edgeType) {
        case 'downward':
          edgeAttrs = `color="${sourceColor}" style=solid`;
          break;
        case 'same-layer':
          edgeAttrs = `color="#FF9800" style=dashed penwidth=2.5`;
          break;
        case 'upward':
          edgeAttrs = `color="#F44336" style=bold penwidth=3 xlabel="VIOLATION"`;
          break;
      }

      lines.push(`  "${dir}" -> "${dep}" [${edgeAttrs}]`);
    }
  }

  // Legend as a compact HTML-table node pinned at the bottom
  lines.push('');
  lines.push('  // Legend');
  lines.push('  { rank=sink');
  lines.push('    "legend" [');
  lines.push('      shape=plaintext');
  lines.push('      margin=0');
  lines.push('      label=<');
  lines.push('        <table border="1" cellborder="0" cellspacing="4" cellpadding="6" bgcolor="#ffffff" color="#cccccc" style="rounded">');
  lines.push('          <tr><td colspan="7"><b>Legend</b></td></tr>');
  lines.push('          <tr>');
  lines.push('            <td colspan="7"><font color="#666666" point-size="9"><b>Edges:</b> colored by source layer | ');
  lines.push('              <font color="#FF9800">- - Same-layer</font> | ');
  lines.push('              <font color="#F44336"><b>--- VIOLATION</b></font>');
  lines.push('            </font></td>');
  lines.push('          </tr>');
  lines.push('          <tr>');

  for (const layer of LAYERS) {
    const safeName = layer.label.replace(/Layer \d+ - /, '').replace(/&/g, '&amp;');
    lines.push(`            <td bgcolor="${layer.color}" border="1" color="${layer.borderColor}"><font color="${layer.fontColor}" point-size="9">${safeName}</font></td>`);
  }

  lines.push('          </tr>');
  lines.push('        </table>');
  lines.push('      >');
  lines.push('    ]');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const formatIdx = args.indexOf('--format');
  const format = formatIdx >= 0 ? args[formatIdx + 1] : 'svg';

  const nameToDir = loadPackagesMap();
  const graph = buildGraph(nameToDir);

  const dot = generateDot(graph);

  if (format === 'dot') {
    process.stdout.write(dot);
    return;
  }

  // Check for graphviz
  try {
    execSync('which dot', { stdio: 'pipe' });
  } catch {
    console.error('Error: graphviz `dot` command not found. Install graphviz or use --format dot.');
    process.exit(1);
  }

  const ext = format === 'png' ? 'png' : 'svg';
  const outFile = path.join(ROOT, `dependency-graph.${ext}`);

  try {
    const result = execSync(`dot -T${ext}`, {
      input: dot,
      maxBuffer: 10 * 1024 * 1024,
    });
    fs.writeFileSync(outFile, result);
    console.log(`Dependency graph written to ${outFile}`);
  } catch (err) {
    console.error('Failed to render graph with graphviz:', err.message);
    // Fall back to writing DOT file
    const dotFile = path.join(ROOT, 'dependency-graph.dot');
    fs.writeFileSync(dotFile, dot);
    console.log(`DOT source written to ${dotFile} (render manually with: dot -Tsvg ${dotFile} -o ${outFile})`);
  }

  // Print summary
  const totalPackages = graph.size;
  const totalEdges = [...graph.values()].reduce((sum, deps) => sum + deps.length, 0);
  const violations = [];
  for (const [dir, deps] of graph) {
    for (const dep of deps) {
      const cls = classifyEdge(dir, dep);
      if (cls === 'upward') violations.push(`${dir} -> ${dep}`);
    }
  }

  console.log(`\nPackages: ${totalPackages} | Dependencies: ${totalEdges} | Violations: ${violations.length}`);
  if (violations.length > 0) {
    console.log('Upward dependency violations:');
    for (const v of violations) {
      console.log(`  - ${v}`);
    }
  }
}

main();
