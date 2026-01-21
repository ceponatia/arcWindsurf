#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT_DIR = path.join(ROOT, 'packages', 'schemas', 'src', 'body-regions', 'templates-json');
const OUTPUT_FILE = path.join(
  ROOT,
  'packages',
  'schemas',
  'src',
  'body-regions',
  'sensoryTemplates.ts'
);

function isJsonFile(entry) {
  return entry.isFile() && entry.name.endsWith('.json');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function toConstName(id) {
  const base = id
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  const withPrefix = /^[0-9]/.test(base) ? `TEMPLATE_${base}` : base;
  return `${withPrefix}_TEMPLATE`;
}

function stringifyTemplate(template) {
  return JSON.stringify(template, null, 2);
}

function buildOutput(templates) {
  const lines = [];
  lines.push('// THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.');
  lines.push('// Source JSON: packages/schemas/src/body-regions/templates-json');
  lines.push('');
  lines.push("import type { SensoryTemplate } from './sensoryTemplate.js';");
  lines.push('');

  const constNames = [];
  for (const template of templates) {
    const constName = toConstName(template.id);
    constNames.push(constName);
    lines.push(`export const ${constName}: SensoryTemplate = ${stringifyTemplate(template)};`);
    lines.push('');
  }

  lines.push('export function getSensoryTemplates(): SensoryTemplate[] {');
  lines.push('  return [');
  for (const constName of constNames) {
    lines.push(`    ${constName},`);
  }
  lines.push('  ];');
  lines.push('}');
  lines.push('');
  lines.push('export function getSensoryTemplateById(id: string): SensoryTemplate | undefined {');
  lines.push('  return getSensoryTemplates().find((template) => template.id === id);');
  lines.push('}');
  lines.push('');

  return `${lines.join('\n')}`;
}

function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    throw new Error(`Templates directory not found: ${INPUT_DIR}`);
  }

  const entries = fs.readdirSync(INPUT_DIR, { withFileTypes: true }).filter(isJsonFile);
  const templates = entries
    .map((entry) => {
      const filePath = path.join(INPUT_DIR, entry.name);
      const template = readJson(filePath);
      if (!template || typeof template.id !== 'string' || template.id.length === 0) {
        throw new Error(`Template JSON missing id: ${filePath}`);
      }
      return template;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const output = buildOutput(templates);
  fs.writeFileSync(OUTPUT_FILE, `${output}\n`, 'utf8');
}

main();
