// import { fetch } from 'undici';

const API_URL = 'http://127.0.0.1:3001';

async function runTest() {
  console.log('Starting rename verification test...');

  const payload = {
    characterId: 'char-aria-1',
    settingId: 'setting-mistshore', // legacy ID from example data (no longer used in UI)
  };

  console.log('Creating session with:', payload);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const res = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    console.log('Session created:', data);

    const { id, characterId, settingId } = data;

    // Verification 1: IDs should be different from original
    if (characterId === payload.characterId) {
      throw new Error(`FAIL: characterId is unchanged (${characterId})`);
    }
    if (settingId === payload.settingId) {
      throw new Error(`FAIL: settingId is unchanged (${settingId})`);
    }

    console.log('PASS: Session created successfully with new schema.');
    return { characterId, settingId };
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTest();
