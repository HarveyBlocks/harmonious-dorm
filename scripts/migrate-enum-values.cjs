const { PrismaClient } = require('@prisma/client');

/** @type {any} */
const prisma = new PrismaClient();

const STATUS_MAPPINGS = [
  { from: '学习', to: 'study' },
  { from: '睡觉', to: 'sleep' },
  { from: '游戏', to: 'game' },
  { from: '外出', to: 'out' },
];

const BILL_CATEGORY_MAPPINGS = [
  { from: '电费', to: 'electricity' },
  { from: '水费', to: 'water' },
  { from: '网费', to: 'internet' },
  { from: '日用品', to: 'supplies' },
  { from: '其他', to: 'other' },
  { from: '自定义', to: 'other' },
];

async function countStatusByValues(values) {
  const rows = [];
  for (const value of values) {
    // eslint-disable-next-line no-await-in-loop
    const count = await prisma.status.count({ where: { state: value } });
    rows.push({ value, count });
  }
  return rows;
}

async function countBillByValues(values) {
  const rows = [];
  for (const value of values) {
    // eslint-disable-next-line no-await-in-loop
    const count = await prisma.bill.count({ where: { category: value } });
    rows.push({ value, count });
  }
  return rows;
}

async function migrateStatus() {
  let updated = 0;
  for (const { from, to } of STATUS_MAPPINGS) {
    // eslint-disable-next-line no-await-in-loop
    const result = await prisma.status.updateMany({ where: { state: from }, data: { state: to } });
    updated += result.count;
  }
  return updated;
}

async function migrateBillCategory() {
  let updated = 0;
  for (const { from, to } of BILL_CATEGORY_MAPPINGS) {
    // eslint-disable-next-line no-await-in-loop
    const result = await prisma.bill.updateMany({ where: { category: from }, data: { category: to } });
    updated += result.count;
  }
  return updated;
}

async function main() {
  console.log('== Enum Value Migration Start ==');

  const statusBefore = await countStatusByValues(STATUS_MAPPINGS.map((item) => item.from));
  const billBefore = await countBillByValues(BILL_CATEGORY_MAPPINGS.map((item) => item.from));

  console.log('Status (before):', statusBefore);
  console.log('Bill category (before):', billBefore);

  const statusUpdated = await migrateStatus();
  const billUpdated = await migrateBillCategory();

  const statusAfter = await countStatusByValues(STATUS_MAPPINGS.map((item) => item.to));
  const billAfter = await countBillByValues(['electricity', 'water', 'internet', 'supplies', 'other']);

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
