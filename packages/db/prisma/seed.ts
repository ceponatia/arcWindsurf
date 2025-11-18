// Seed script (idempotent). Currently a no-op placeholder.
// Use this to pre-create sessions or test data if needed.

import { prisma } from '../src/db/prisma.js';

async function ensureSeedSession() {
  const sessionId = 'seed-session-1';
  const characterId = 'char-aria-1';
  const settingId = 'setting-mistshore';
  await prisma.userSession.upsert({
    where: { id: sessionId },
    create: { id: sessionId, characterId, settingId },
    update: { characterId, settingId },
  });
  const existing = await prisma.message.findMany({ where: { sessionId }, orderBy: { idx: 'asc' } });
  if (existing.length === 0) {
    await prisma.message.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          sessionId,
          idx: 1,
          role: 'user',
          content: 'Hello, Aria. The fog is thicker tonight. Any omens?',
        },
        {
          id: crypto.randomUUID(),
          sessionId,
          idx: 2,
          role: 'assistant',
          content:
            'The harbor bells hush under the fog. Aria tucks a charm into her glove and murmurs, "Stormlight walks the piers when the fog tastes of iron. Stay close."',
        },
      ],
    });
  }
}

async function main() {
  await ensureSeedSession();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
