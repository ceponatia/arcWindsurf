#!/usr/bin/env node
// Quick validation script to ensure data JSON files conform to expected shape
import fs from 'fs';
import path from 'path';
import {
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_HEIGHTS,
  APPEARANCE_LEGS_BUILD,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_TORSOS,
  SPEECH_DARKNESS_LEVELS,
  SPEECH_FORMALITY_LEVELS,
  SPEECH_HUMOR_LEVELS,
  SPEECH_PACING_LEVELS,
  SPEECH_SENTENCE_LENGTHS,
  SPEECH_VERBOSITY_LEVELS,
} from '../packages/schemas/dist/index.js';

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
      sentenceLength: SPEECH_SENTENCE_LENGTHS,
      humor: SPEECH_HUMOR_LEVELS,
      darkness: SPEECH_DARKNESS_LEVELS,
      pacing: SPEECH_PACING_LEVELS,
      formality: SPEECH_FORMALITY_LEVELS,
      verbosity: SPEECH_VERBOSITY_LEVELS,
    };
    for (const [key, allowed] of Object.entries(enums)) {
      if (style[key] && !allowed.includes(style[key]))
        errs.push(`style.${key} invalid (${style[key]}) must be one of ${allowed.join('|')}`);
    }
  }
  // Physique (optional string or object: build + appearance buckets)
  if (obj.physique) {
    if (typeof obj.physique === 'string') {
      if (obj.physique.length === 0) errs.push('physique string must be non-empty');
    } else if (typeof obj.physique === 'object' && !Array.isArray(obj.physique)) {
      const ph = obj.physique;
      const build = ph.build;
      const appearance = ph.appearance;

      if (build) {
        if (build.height && !APPEARANCE_HEIGHTS.includes(build.height)) {
          errs.push(
            `physique.build.height invalid (${build.height}) must be one of ${APPEARANCE_HEIGHTS.join(
              '|'
            )}`
          );
        }
        if (build.torso && !APPEARANCE_TORSOS.includes(build.torso)) {
          errs.push(
            `physique.build.torso invalid (${build.torso}) must be one of ${APPEARANCE_TORSOS.join(
              '|'
            )}`
          );
        }
        if (build.skinTone && (typeof build.skinTone !== 'string' || build.skinTone.length === 0)) {
          errs.push('physique.build.skinTone must be non-empty string');
        }
        if (build.arms) {
          if (build.arms.build && !APPEARANCE_ARMS_BUILD.includes(build.arms.build)) {
            errs.push(
              `physique.build.arms.build invalid (${build.arms.build}) must be one of ${APPEARANCE_ARMS_BUILD.join(
                '|'
              )}`
            );
          }
          if (build.arms.length && !APPEARANCE_ARMS_LENGTH.includes(build.arms.length)) {
            errs.push(
              `physique.build.arms.length invalid (${build.arms.length}) must be one of ${APPEARANCE_ARMS_LENGTH.join(
                '|'
              )}`
            );
          }
        }
        if (build.legs) {
          if (build.legs.length && !APPEARANCE_LEGS_LENGTH.includes(build.legs.length)) {
            errs.push(
              `physique.build.legs.length invalid (${build.legs.length}) must be one of ${APPEARANCE_LEGS_LENGTH.join(
                '|'
              )}`
            );
          }
          if (build.legs.build && !APPEARANCE_LEGS_BUILD.includes(build.legs.build)) {
            errs.push(
              `physique.build.legs.build invalid (${build.legs.build}) must be one of ${APPEARANCE_LEGS_BUILD.join(
                '|'
              )}`
            );
          }
        }
      }

      if (appearance) {
        if (appearance.hair) {
          if (
            appearance.hair.color &&
            (typeof appearance.hair.color !== 'string' || appearance.hair.color.length === 0)
          ) {
            errs.push('physique.appearance.hair.color must be non-empty string');
          }
          if (
            appearance.hair.style &&
            (typeof appearance.hair.style !== 'string' || appearance.hair.style.length === 0)
          ) {
            errs.push('physique.appearance.hair.style must be non-empty string');
          }
          if (
            appearance.hair.length &&
            (typeof appearance.hair.length !== 'string' || appearance.hair.length.length === 0)
          ) {
            errs.push('physique.appearance.hair.length must be non-empty string');
          }
        }
        if (appearance.eyes) {
          if (
            appearance.eyes.color &&
            (typeof appearance.eyes.color !== 'string' || appearance.eyes.color.length === 0)
          ) {
            errs.push('physique.appearance.eyes.color must be non-empty string');
          }
        }
        if (
          appearance.features &&
          (!Array.isArray(appearance.features) ||
            appearance.features.some((f) => typeof f !== 'string' || f.length === 0))
        ) {
          errs.push('physique.appearance.features must be array of non-empty strings');
        }
      }
    } else {
      errs.push('physique must be a string or object');
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
    obj.themes &&
    (!Array.isArray(obj.themes) || obj.themes.some((t) => typeof t !== 'string' || t.length === 0))
  )
    errs.push('themes must be an array of non-empty strings');
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
