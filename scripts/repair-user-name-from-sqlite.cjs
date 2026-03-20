const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function decodeHexUtf8(hex) {
  if (!hex || typeof hex !== 'string') return '';
  const buf = Buffer.from(hex, 'hex');
  return buf.toString('utf8');
}

function normalizeName(raw, id) {
  const cleaned = String(raw || '')
    .replace(/\u0000/g, '')
    .replace(/\uFFFD+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || `User-${id}`;
}

async function listUserIds() {
  return prisma.$queryRawUnsafe('SELECT id FROM users ORDER BY id ASC');
}

async function probeBrokenUserIds(ids) {
  const broken = [];
  for (const row of ids) {
    const id = Number(row.id);
    try {
      await prisma.user.findFirst({
        where: { id },
        select: { id: true, name: true, email: true, createdAt: true },
      });
    } catch (error) {
      broken.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return broken;
}

async function readNameHexById(id) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, hex(CAST(name AS BLOB)) AS nameHex, typeof(name) AS nameType, quote(created_at) AS createdQuoted, typeof(created_at) AS createdType FROM users WHERE id = ${Number(id)} LIMIT 1`,
  );
  return rows[0] || null;
}

async function writeName(id, name) {
  return prisma.$executeRawUnsafe('UPDATE users SET name = ? WHERE id = ?', name, Number(id));
}

function unwrapSqliteQuote(value) {
  if (typeof value !== 'string') return '';
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

function normalizeCreatedAtToEpochMs(createdQuoted) {
  const raw = unwrapSqliteQuote(String(createdQuoted || '')).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  // Normalize common sqlite date text: "YYYY-MM-DD HH:mm:ss.SSS"
  const isoLike = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const parsed = new Date(isoLike);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.getTime();
}

async function writeCreatedAt(id, epochMs) {
  return prisma.$executeRawUnsafe('UPDATE users SET created_at = ? WHERE id = ?', Number(epochMs), Number(id));
}

async function main() {
  const ids = await listUserIds();
  const brokenBefore = await probeBrokenUserIds(ids);
  console.log(`[repair-user-name] total users=${ids.length}, broken before=${brokenBefore.length}`);
  if (brokenBefore.length === 0) {
    console.log('[repair-user-name] no broken rows, nothing to repair.');
    return;
  }

  for (const item of brokenBefore) {
    const raw = await readNameHexById(item.id);
    if (!raw) {
      console.log(`[repair-user-name] skip id=${item.id}, row not found`);
      continue;
    }
    const decoded = decodeHexUtf8(raw.nameHex);
    const repaired = normalizeName(decoded, item.id);
    await writeName(item.id, repaired);
    const createdEpoch = normalizeCreatedAtToEpochMs(raw.createdQuoted);
    if (createdEpoch !== null) {
      await writeCreatedAt(item.id, createdEpoch);
    }
    console.log(
      `[repair-user-name] repaired id=${item.id}, nameType=${raw.nameType}, nameHexLen=${String(raw.nameHex || '').length}, repairedName="${repaired}", createdType=${raw.createdType}, createdQuoted=${raw.createdQuoted}, normalizedCreatedAt=${createdEpoch}`,
    );
  }

  const brokenAfter = await probeBrokenUserIds(ids);
  console.log(`[repair-user-name] broken after=${brokenAfter.length}`);
  if (brokenAfter.length > 0) {
    console.log('[repair-user-name] remaining broken rows:', brokenAfter);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('[repair-user-name] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
