const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STATUS_MAP = {
  '学习': 'study',
  '睡觉': 'sleep',
  '游戏': 'game',
  '外出': 'out',
};

const BILL_CATEGORY_MAP = {
  '电费': 'electricity',
  '水费': 'water',
  '网费': 'internet',
  '日用品': 'supplies',
  '其他': 'other',
  '自定义': 'other',
};

async function countByValue(table, field, values) {
  const rows = [];
  for (const value of values) {
    // eslint-disable-next-line no-await-in-loop
    const count = await prisma[table].count({ where: { [field]: value } });
    rows.push({ value, count });
  }
  return rows;
}

async function migrateStatus() {
  let updated = 0;
  for (const [from, to] of Object.entries(STATUS_MAP)) {
    // eslint-disable-next-line no-await-in-loop
    const result = await prisma.status.updateMany({ where: { state: from }, data: { state: to } });
    updated += result.count;
  }
  return updated;
}

async function migrateBillCategory() {
  let updated = 0;
  for (const [from, to] of Object.entries(BILL_CATEGORY_MAP)) {
    // eslint-disable-next-line no-await-in-loop
    const result = await prisma.bill.updateMany({ where: { category: from }, data: { category: to } });
    updated += result.count;
  }
  return updated;
}

async function main() {
  console.log('== Enum Value Migration Start ==');

  const statusBefore = await countByValue('status', 'state', Object.keys(STATUS_MAP));
  const billBefore = await countByValue('bill', 'category', Object.keys(BILL_CATEGORY_MAP));

  console.log('Status (before):', statusBefore);
  console.log('Bill category (before):', billBefore);

  const statusUpdated = await migrateStatus();
  const billUpdated = await migrateBillCategory();

  const statusAfter = await countByValue('status', 'state', Object.values(STATUS_MAP));
  const billAfter = await countByValue('bill', 'category', ['electricity', 'water', 'internet', 'supplies', 'other']);

  console.log('Updated status rows:', statusUpdated);
  console.log('Updated bill category rows:', billUpdated);
  console.log('Status (after):', statusAfter);
  console.log('Bill category (after):', billAfter);
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
