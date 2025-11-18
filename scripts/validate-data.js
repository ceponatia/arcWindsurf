#!/usr/bin/env node
// Quick validation script to ensure data JSON files conform to expected shape
import fs from 'fs';
import path from 'path';

const base = path.resolve(process.cwd(), 'data');

function readJSON(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(`Invalid JSON in ${filePath}:`, err.message);
    process.exitCode = 2;
    return null;
  }
}

function validateCharacter(obj, file) {
  const errs = [];
  if (!obj || typeof obj !== 'object') errs.push('must be an object');
  // Core required scalar fields (personality handled separately; age optional)
  const requiredScalars = ['id', 'name', 'summary', 'backstory', 'speakingStyle'];
  for (const k of requiredScalars) {
    if (!obj[k] || typeof obj[k] !== 'string' || obj[k].length === 0)
      errs.push(`${k} must be non-empty string`);
  }
  // Personality: string or array of strings
  if (!('personality' in obj)) {
    errs.push('personality is required');
  } else {
    const pers = obj.personality;
    if (typeof pers === 'string') {
      if (pers.length === 0) errs.push('personality string must be non-empty');
    } else if (Array.isArray(pers)) {
      if (pers.length === 0 || pers.some((p) => typeof p !== 'string' || p.length === 0))
        errs.push('personality array must contain non-empty strings');
    } else {
      errs.push('personality must be a string or array of strings');
    }
  }
  // Age (optional; enforce 16..120)
  if (obj.age !== undefined) {
    if (typeof obj.age !== 'number' || !Number.isInteger(obj.age) || obj.age < 16 || obj.age > 120)
      errs.push('age must be integer 16..120');
  }
  // Goals
  if (!Array.isArray(obj.goals) || obj.goals.some((g) => typeof g !== 'string' || g.length === 0))
    errs.push('goals must be an array of non-empty strings');
  // Tags
  if (
    obj.tags &&
    (!Array.isArray(obj.tags) || obj.tags.some((t) => typeof t !== 'string' || t.length === 0))
  )
    errs.push('tags must be an array of non-empty strings');
  // Style object (optional)
  if (obj.style) {
    const style = obj.style;
    if (typeof style !== 'object' || Array.isArray(style)) errs.push('style must be an object');
    const enums = {
      sentenceLength: ['terse', 'balanced', 'long'],
      humor: ['none', 'light', 'wry', 'dark'],
      darkness: ['low', 'medium', 'high'],
      pacing: ['slow', 'balanced', 'fast'],
      formality: ['casual', 'neutral', 'formal'],
      verbosity: ['terse', 'balanced', 'lavish'],
    };
    for (const [key, allowed] of Object.entries(enums)) {
      if (style[key] && !allowed.includes(style[key]))
        errs.push(`style.${key} invalid (${style[key]}) must be one of ${allowed.join('|')}`);
    }
  }
  // Appearance (optional string or object)
  if (obj.appearance) {
    if (typeof obj.appearance === 'string') {
      if (obj.appearance.length === 0) errs.push('appearance string must be non-empty');
    } else if (typeof obj.appearance === 'object' && !Array.isArray(obj.appearance)) {
      const ap = obj.appearance;
      // height categorical
      if (ap.height && !['short', 'average', 'tall'].includes(ap.height))
        errs.push(`appearance.height invalid (${ap.height}) must be short|average|tall`);
      if (ap.build && !['slight', 'average', 'athletic', 'heavy'].includes(ap.build))
        errs.push(`appearance.build invalid (${ap.build}) must be slight|average|athletic|heavy`);
      if (
        ap.features &&
        (!Array.isArray(ap.features) ||
          ap.features.some((f) => typeof f !== 'string' || f.length === 0))
      )
        errs.push('appearance.features must be array of non-empty strings');
      if (ap.skinTone && (typeof ap.skinTone !== 'string' || ap.skinTone.length === 0))
        errs.push('appearance.skinTone must be non-empty string');
      if (ap.description && (typeof ap.description !== 'string' || ap.description.length === 0))
        errs.push('appearance.description must be non-empty string');
      // Deprecated / disallowed fields
      const deprecated = [
        'heightCm',
        'nubile',
        'breastSize',
        'clothingStyle',
        'distinguishingFeatures',
      ];
      for (const d of deprecated) {
        if (d in ap) errs.push(`appearance.${d} is deprecated/disallowed`);
      }
    } else {
      errs.push('appearance must be a string or object');
    }
  }
  // Scent (optional)
  if (obj.scent) {
    if (typeof obj.scent !== 'object' || Array.isArray(obj.scent)) {
      errs.push('scent must be an object');
    } else {
      const sc = obj.scent;
      if (sc.hairScent && (typeof sc.hairScent !== 'string' || sc.hairScent.length === 0))
        errs.push('scent.hairScent must be non-empty string');
      if (sc.bodyScent && (typeof sc.bodyScent !== 'string' || sc.bodyScent.length === 0))
        errs.push('scent.bodyScent must be non-empty string');
      if (sc.perfume && (typeof sc.perfume !== 'string' || sc.perfume.length === 0))
        errs.push('scent.perfume must be non-empty string');
    }
  }
  if (errs.length) {
    console.error(`Validation errors in ${file}:`);
    errs.forEach((e) => console.error('-', e));
    process.exitCode = 3;
  }
}

function validateSetting(obj, file) {
  const errs = [];
  if (!obj || typeof obj !== 'object') errs.push('must be an object');
  if (!obj.id || typeof obj.id !== 'string' || obj.id.length === 0)
    errs.push('id must be non-empty string');
  if (!obj.name || typeof obj.name !== 'string' || obj.name.length === 0)
    errs.push('name must be non-empty string');
  if (!obj.lore || typeof obj.lore !== 'string' || obj.lore.length === 0)
    errs.push('lore must be non-empty string');
  if (!obj.tone || typeof obj.tone !== 'string' || obj.tone.length === 0)
    errs.push('tone must be non-empty string');
  if (
    obj.constraints &&
    (!Array.isArray(obj.constraints) ||
      obj.constraints.some((t) => typeof t !== 'string' || t.length === 0))
  )
    errs.push('constraints must be an array of non-empty strings');
  if (errs.length) {
    console.error(`Validation errors in ${file}:`);
    errs.forEach((e) => console.error('-', e));
    process.exitCode = 3;
  }
}

function run() {
  let ok = true;
  const charDir = path.join(base, 'characters');
  const settingDir = path.join(base, 'settings');
  if (fs.existsSync(charDir)) {
    for (const f of fs.readdirSync(charDir)) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(charDir, f);
      const obj = readJSON(p);
      if (!obj) {
        ok = false;
        continue;
      }
      validateCharacter(obj, p);
      if (process.exitCode) ok = false;
    }
  }
  if (fs.existsSync(settingDir)) {
    for (const f of fs.readdirSync(settingDir)) {
      if (!f.endsWith('.json')) continue;
      const p = path.join(settingDir, f);
      const obj = readJSON(p);
      if (!obj) {
        ok = false;
        continue;
      }
      validateSetting(obj, p);
      if (process.exitCode) ok = false;
    }
  }
  if (!ok) {
    console.error('Validation failed');
    process.exitCode = process.exitCode || 1;
  } else {
    console.log('All JSON data files are valid (basic checks passed).');
  }
}

run();
