const { PrismaClient } = require('@prisma/client');
const domainAliases = require('../lib/domain-aliases.json');

/** @type {any} */
const prisma = new PrismaClient();

function buildAliasIndex(rows) {
  /** @type {Map<string, string>} */
  const index = new Map();
  rows.forEach((row) => {
    row.aliases.forEach((alias) => {
      index.set(String(alias).trim(), row.code);
    });
  });
  return index;
}

const STATE_INDEX = buildAliasIndex(domainAliases.dormStates);
const CATEGORY_INDEX = buildAliasIndex(domainAliases.billCategories);

function normalizeByIndex(value, fallbackCode, index) {
  const normalized = String(value || '').trim();
  return index.get(normalized) || fallbackCode;
}

async function migrateStatusValues() {
  const rows = await prisma.status.findMany({
    select: { userId: true, state: true },
  });
  let updated = 0;
  for (const row of rows) {
    const nextState = normalizeByIndex(row.state, 'out', STATE_INDEX);
    if (nextState === row.state) continue;
    // eslint-disable-next-line no-await-in-loop
    await prisma.status.update({
      where: { userId: row.userId },
      data: { state: nextState },
    });
    updated += 1;
  }
  return updated;
}

async function migrateBillCategoryValues() {
  const rows = await prisma.bill.findMany({
    select: { id: true, category: true },
  });
  let updated = 0;
  for (const row of rows) {
    const nextCategory = normalizeByIndex(row.category, 'other', CATEGORY_INDEX);
    if (nextCategory === row.category) continue;
    // eslint-disable-next-line no-await-in-loop
    await prisma.bill.update({
      where: { id: row.id },
      data: { category: nextCategory },
    });
    updated += 1;
  }
  return updated;
}

async function main() {
  console.log('== Enum Value Migration Start ==');

  const [statusUpdated, billUpdated] = await Promise.all([
    migrateStatusValues(),
    migrateBillCategoryValues(),
  ]);

  console.log('Updated status rows:', statusUpdated);
  console.log('Updated bill category rows:', billUpdated);
  console.log('== Enum Value Migration Done ==');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
