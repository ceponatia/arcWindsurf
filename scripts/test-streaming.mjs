#!/usr/bin/env node

/**
 * Streaming test helper.
 *
 * Supports two targets:
 * - target=studio: Connects to the API SSE endpoint `/studio/generate/stream` and verifies a `done` event.
 * - target=openai: Connects to an OpenAI-compatible streaming endpoint (OpenAI/OpenRouter) and verifies `[DONE]`.
 *
 * This is intentionally dependency-light; it uses Node 20+ built-in `fetch`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const eq = arg.indexOf('=');
    if (eq !== -1) {
      const key = arg.slice(2, eq);
      const value = arg.slice(eq + 1);
      out[key] = value;
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

/**
 * @param {string | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parseIntOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function toJsonString(value) {
  return JSON.stringify(value ?? null);
}

/**
 * @param {string} filePath
 * @returns {Promise<unknown>}
 */
async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Minimal SSE parser for `text/event-stream`.
 *
 * @param {ReadableStream<Uint8Array>} readable
 * @param {(evt: {event?: string, data: string, id?: string}) => Promise<void>} onEvent
 * @returns {Promise<void>}
 */
async function parseSse(readable, onEvent) {
  const reader = readable.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line
    while (true) {
      const sepIndex = buffer.indexOf('\n\n');
      if (sepIndex === -1) break;

      const rawEvent = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      /** @type {string | undefined} */
      let event;
      /** @type {string | undefined} */
      let id;
      /** @type {string[]} */
      const dataLines = [];

      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice('event:'.length).trim();
        } else if (line.startsWith('id:')) {
          id = line.slice('id:'.length).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice('data:'.length).trim());
        }
      }

      const data = dataLines.join('\n');
      if (data.length === 0 && !event) continue;

      await onEvent({ event, data, id });
    }
  }
}

/**
 * @param {string} msg
 * @returns {never}
 */
function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
  throw new Error(msg);
}

/**
 * @returns {string}
 */
function helpText() {
  return `\
Usage:
  node scripts/test-streaming.mjs --target=studio --message "Hello" [options]
  node scripts/test-streaming.mjs --target=studio-generate --message "Hello" [options]
  node scripts/test-streaming.mjs --target=studio-infer-traits --message "..." --characterResponse "..." [options]
  node scripts/test-streaming.mjs --target=openai --message "Hello" [options]

Targets:
  --target=studio    Connect to API SSE endpoint /studio/generate/stream (expects event: done)
  --target=studio-generate       POST /studio/generate (non-streaming)
  --target=studio-infer-traits   POST /studio/infer-traits (non-streaming)
  --target=openai    Connect to OpenAI-compatible chat.completions stream (expects [DONE])

Common options:
  --message "..."            User message to send (required)
  --timeoutMs 120000         Abort if exceeded

Studio options:
  --apiBaseUrl http://localhost:3001
  --profile '{"name":"..."}'
  --profileFile path/to/profile.json
  --history '[]'
  --historyFile path/to/history.json

Infer-traits options:
  --characterResponse "..."          Required when --target=studio-infer-traits
  --characterResponseFile path        Load characterResponse from file
  --currentProfile '{...}'            Defaults to {}
  --currentProfileFile path           Load currentProfile from file

OpenAI/OpenRouter options:
  --baseUrl https://openrouter.ai/api/v1   (or OPENAI_BASE_URL)
  --apiKey  ...                            (or OPENROUTER_API_KEY / OPENAI_API_KEY)
  --model   ...                            (or OPENROUTER_MODEL / OPENAI_MODEL)
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args['help'] || args['h']) {
    console.log(helpText());
    return;
  }

  const target = String(args['target'] ?? 'studio');
  const message = args['message'] ? String(args['message']) : '';
  if (!message) {
    fail('Missing required --message. Use --help for usage.');
  }

  const timeoutMs = parseIntOr(args['timeoutMs'] ? String(args['timeoutMs']) : undefined, 120_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (target === 'studio') {
      const apiPort = parseIntOr(process.env.API_PORT ?? process.env.PORT, 3001);
      const apiBaseUrl = String(args['apiBaseUrl'] ?? process.env.VITE_API_BASE_URL ?? `http://localhost:${apiPort}`);

      const profile = args['profileFile']
        ? await readJsonFile(String(args['profileFile']))
        : args['profile']
          ? JSON.parse(String(args['profile']))
          : {};

      const history = args['historyFile']
        ? await readJsonFile(String(args['historyFile']))
        : args['history']
          ? JSON.parse(String(args['history']))
          : [];

      const url = new URL('/studio/generate/stream', apiBaseUrl);
      url.searchParams.set('profile', toJsonString(profile));
      url.searchParams.set('history', toJsonString(history));
      url.searchParams.set('userMessage', message);

      console.log(`Connecting (studio SSE): ${url.toString()}`);

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        fail(`HTTP ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
      }

      let sawDone = false;

      await parseSse(res.body, async ({ event, data }) => {
        if (event === 'content') {
          try {
            const parsed = JSON.parse(data);
            if (typeof parsed?.content === 'string') {
              process.stdout.write(parsed.content);
            } else {
              process.stdout.write(data);
            }
          } catch {
            process.stdout.write(data);
          }
          return;
        }

        if (event === 'error') {
          console.error(`\n[stream error] ${data}`);
          return;
        }

        if (event === 'done') {
          sawDone = true;
          console.log('\n[done]');
          return;
        }

        console.log(`\n[${event ?? 'message'}] ${data}`);
      });

      if (!sawDone) {
        fail('Stream ended without a `done` event.');
      }
      return;
    }

    if (target === 'studio-generate') {
      const apiPort = parseIntOr(process.env.API_PORT ?? process.env.PORT, 3001);
      const apiBaseUrl = String(args['apiBaseUrl'] ?? process.env.VITE_API_BASE_URL ?? `http://localhost:${apiPort}`);

      const profile = args['profileFile']
        ? await readJsonFile(String(args['profileFile']))
        : args['profile']
          ? JSON.parse(String(args['profile']))
          : {};

      const history = args['historyFile']
        ? await readJsonFile(String(args['historyFile']))
        : args['history']
          ? JSON.parse(String(args['history']))
          : [];

      const url = new URL('/studio/generate', apiBaseUrl);
      console.log(`Connecting (studio generate): ${url.toString()}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          history,
          userMessage: message,
        }),
        signal: controller.signal,
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        fail(`HTTP ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
      }

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.content === 'string') {
          process.stdout.write(parsed.content);
          process.stdout.write('\n');
          return;
        }
      } catch {
        // ignore
      }

      process.stdout.write(text);
      process.stdout.write('\n');
      return;
    }

    if (target === 'studio-infer-traits') {
      const apiPort = parseIntOr(process.env.API_PORT ?? process.env.PORT, 3001);
      const apiBaseUrl = String(args['apiBaseUrl'] ?? process.env.VITE_API_BASE_URL ?? `http://localhost:${apiPort}`);

      const characterResponse = args['characterResponseFile']
        ? await fs.readFile(String(args['characterResponseFile']), 'utf8')
        : args['characterResponse']
          ? String(args['characterResponse'])
          : '';
      if (!characterResponse) {
        fail('Missing required --characterResponse (or --characterResponseFile) for --target=studio-infer-traits');
      }

      const currentProfile = args['currentProfileFile']
        ? await readJsonFile(String(args['currentProfileFile']))
        : args['currentProfile']
          ? JSON.parse(String(args['currentProfile']))
          : {};

      const url = new URL('/studio/infer-traits', apiBaseUrl);
      console.log(`Connecting (studio infer-traits): ${url.toString()}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: message,
          characterResponse,
          currentProfile,
        }),
        signal: controller.signal,
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        fail(`HTTP ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
      }

      process.stdout.write(text);
      process.stdout.write('\n');
      return;
    }

    if (target === 'openai') {
      const baseUrl = String(
        args['baseUrl'] ??
        process.env.OPENAI_BASE_URL ??
        (process.env.OPENROUTER_API_KEY ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1')
      );

      const apiKey = String(
        args['apiKey'] ?? process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? ''
      );
      if (!apiKey) {
        fail('Missing API key. Provide --apiKey or set OPENAI_API_KEY / OPENROUTER_API_KEY in .env');
      }

      const model = String(args['model'] ?? process.env.OPENAI_MODEL ?? process.env.OPENROUTER_MODEL ?? 'gpt-4o-mini');

      const url = new URL('/chat/completions', baseUrl);

      console.log(`Connecting (OpenAI stream): ${url.toString()} (model=${model})`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: 'user', content: message }],
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        fail(`HTTP ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sawDone = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const sepIndex = buffer.indexOf('\n\n');
          if (sepIndex === -1) break;
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);

          // OpenAI-compatible streaming uses `data: ...` lines; the terminator is `data: [DONE]`.
          const dataLines = rawEvent
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice('data:'.length).trim());

          for (const data of dataLines) {
            if (data === '[DONE]') {
              sawDone = true;
              console.log('\n[done]');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === 'string') {
                process.stdout.write(delta);
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }

      if (!sawDone) {
        fail('Stream ended without a [DONE] chunk.');
      }
      return;
    }

    fail(`Unknown --target=${target}. Use --help.`);
  } finally {
    clearTimeout(timeout);
  }
}

await main();
