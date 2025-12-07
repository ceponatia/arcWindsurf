import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildDimensionTraitPhrases } from '../packages/agents/dist/personality-mapping.js';

// Load the API package .env so CLI tests can reuse the same OpenRouter config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../packages/api/.env') });

async function main() {
  const { trait, scenario, model, dimensions } = parseArgs();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set in the environment.');
    process.exitCode = 1;
    return;
  }

  const sliderTrait = buildTraitFromDimensions(dimensions);

  const resolvedTrait =
    trait || sliderTrait || 'quiet, highly introverted, conflict-avoidant but deeply empathetic';
  const resolvedScenario =
    scenario ||
    'You are in a crowded inn near closing time. You had planned a quiet evening before an important obligation tomorrow morning. A loud group at the next table keeps inviting you to join their drinking game, while a single thoughtful traveler beside you tries to start a calmer conversation. The innkeeper offers you a strange new dish, insisting it is a house specialty that most people are too cautious to try.';

  const resolvedModel = model || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

  const systemContent = [
    'You are roleplaying as a single character in a text-based RPG.',
    'Your job is to stay fully in character and respond as that character would speak and act.',
    '',
    `Personality traits to strongly emphasize: ${resolvedTrait}.`,
    'Make these traits obvious in word choice, body language, and decisions.',
    'Do not explain the traits explicitly; only show them through behavior and voice.',
  ].join(' ');

  const userContent = [
    'Test scene to reveal personality:',
    resolvedScenario,
    '',
    'Respond with 2-5 sentences in first person, in character.',
    'Let your personality quietly guide what you notice, how you feel about the competing invitations, and what you choose to say or do, without naming your traits directly.',
  ].join(' ');

  const messages = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];

  console.log('--- Trait Test Configuration ---');
  console.log('Model:         ', resolvedModel);
  console.log('Trait prompt:  ', resolvedTrait);
  console.log('Scenario:      ', resolvedScenario);
  if (dimensions && Object.keys(dimensions).length > 0) {
    console.log('Dimensions:    ', dimensions);
    if (sliderTrait) {
      console.log('From sliders:  ', sliderTrait);
    }
  }
  console.log('-------------------------------');

  // Show the exact payload we send to the model for inspection
  console.log('\n--- LLM Request (model + messages) ---');
  console.log(
    JSON.stringify(
      {
        model: resolvedModel,
        messages,
      },
      null,
      2
    )
  );
  console.log('--------------------------------------');

  try {
    const reply = await callOpenRouter({ apiKey, model: resolvedModel, messages });
    if (!reply) {
      console.error('No response from model.');
      process.exitCode = 1;
      return;
    }

    console.log('\n--- Model Response ---');
    console.log(reply);
    console.log('----------------------');
  } catch (err) {
    console.error('Trait test failed:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let trait = '';
  let scenario = '';
  let model = '';
  let dimensionsExpr = '';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--trait' && i + 1 < args.length) {
      trait = args[i + 1];
      i += 1;
    } else if (arg === '--scenario' && i + 1 < args.length) {
      scenario = args[i + 1];
      i += 1;
    } else if (arg === '--model' && i + 1 < args.length) {
      model = args[i + 1];
      i += 1;
    } else if (arg === '--dimensions' && i + 1 < args.length) {
      dimensionsExpr = args[i + 1];
      i += 1;
    }
  }

  const dimensions = parseDimensions(dimensionsExpr);

  return { trait, scenario, model, dimensions };
}

function parseDimensions(expr) {
  if (!expr) return undefined;

  const result = {};
  const parts = expr.split(',');

  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const [keyRaw, valueRaw] = part.split('=');
    if (!keyRaw || !valueRaw) continue;

    const key = keyRaw.trim().toLowerCase();
    const value = Number.parseFloat(valueRaw.trim());
    if (!Number.isFinite(value)) continue;

    // Only accept known Big Five keys
    if (
      key === 'openness' ||
      key === 'conscientiousness' ||
      key === 'extraversion' ||
      key === 'agreeableness' ||
      key === 'neuroticism'
    ) {
      const clamped = Math.min(1, Math.max(0, value));
      result[key] = clamped;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function buildTraitFromDimensions(dimensions) {
  if (!dimensions || Object.keys(dimensions).length === 0) return '';

  const pm = { dimensions };
  const lines = buildDimensionTraitPhrases(pm);
  if (!lines || lines.length === 0) return '';
  return lines.join('; ');
}

async function callOpenRouter({ apiKey, model, messages }) {
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const body = {
    model,
    messages,
  };

  const maxRetries = 2;
  const timeoutMs = 60000;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/ceponatia/rpg-light',
          'X-Title': 'Minimal-RPG Trait Tester',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        const isRetryable = res.status >= 500 || res.status === 429;
        if (isRetryable && attempt < maxRetries) {
          lastError = `OpenRouter error ${res.status}: ${text}`;
          console.warn(`[trait-test] Attempt ${attempt + 1} failed (${res.status}), retrying...`);
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw new Error(`OpenRouter error ${res.status}: ${text}`);
      }

      const json = await res.json();
      const content =
        Array.isArray(json.choices) && json.choices[0]?.message?.content
          ? json.choices[0].message.content
          : null;
      if (typeof content === 'string' && content.length > 0) {
        return content;
      }

      throw new Error('Invalid OpenRouter response payload');
    } catch (err) {
      if (isAbortError(err)) {
        throw new Error(`OpenRouter request timed out after ${timeoutMs}ms`);
      }
      if (attempt < maxRetries) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[trait-test] Attempt ${attempt + 1} failed, retrying...`);
        await delay(1000 * (attempt + 1));
        continue;
      }
      throw new Error(lastError || (err instanceof Error ? err.message : String(err)));
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

function isAbortError(err) {
  return err instanceof Error && err.name === 'AbortError';
}

main();
