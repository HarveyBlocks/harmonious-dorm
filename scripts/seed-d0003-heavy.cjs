/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

/** @type {any} */
const prisma = new PrismaClient();

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFrom(arr) { return arr[randInt(0, arr.length - 1)]; }
function isoDate(d) { return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`; }

async function run() {
  const dorm = await prisma.dorm.findUnique({ where: { inviteCode: 'D0003' }, select: { id: true, name: true } });
  if (!dorm) throw new Error('邀请码 D0003 不存在');

  const users = await prisma.user.findMany({ where: { dormId: dorm.id }, orderBy: { id: 'asc' }, select: { id: true, name: true, isLeader: true } });
  if (users.length === 0) throw new Error('D0003 宿舍没有成员');
  const leader = users.find((u) => u.isLeader) || users[0];
  const start = new Date('2023-03-14T00:00:00');
  const now = new Date();
  const categories = ['electricity', 'water', 'internet', 'supplies', 'other'];

  console.log(`Seeding heavy data for dorm D0003 (${dorm.name}), users=${users.length}`);
  console.log('clear existing records in D0003...');
  const billIds = await prisma.bill.findMany({ where: { dormId: dorm.id }, select: { id: true } });
  if (billIds.length > 0) {
    await prisma.billParticipant.deleteMany({ where: { billId: { in: billIds.map((item) => item.id) } } });
  }
  await prisma.notification.deleteMany({ where: { dormId: dorm.id } });
  await prisma.chatMessage.deleteMany({ where: { dormId: dorm.id } });
  await prisma.duty.deleteMany({ where: { dormId: dorm.id } });
  await prisma.bill.deleteMany({ where: { dormId: dorm.id } });

  console.log('create chats...');
  const chats = [];
  for (let i = 0; i < 12000; i += 1) {
    const user = randomFrom(users);
    const date = new Date(start.getTime() + Math.floor(Math.random() * (now.getTime() - start.getTime())));
    chats.push({ dormId: dorm.id, userId: user.id, content: `D0003 聊天压测消息 #${i + 1}`, createdAt: date });
  }
  for (let i = 0; i < chats.length; i += 1000) await prisma.chatMessage.createMany({ data: chats.slice(i, i + 1000) });

  console.log('create duties...');
  const duties = [];
  for (let i = 0; i < 6000; i += 1) {
    const dayOffset = Math.floor(i / users.length);
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    const user = users[i % users.length];
    duties.push({ dormId: dorm.id, userId: user.id, date: isoDate(date), completed: Math.random() > 0.4, imageUrl: null, createdAt: date });
  }
  for (let i = 0; i < duties.length; i += 1000) await prisma.duty.createMany({ data: duties.slice(i, i + 1000) });

  console.log('create bills + participants...');
  for (let i = 0; i < 1200; i += 1) {
    const date = new Date(start.getTime() + Math.floor(Math.random() * (now.getTime() - start.getTime())));
    const bill = await prisma.bill.create({
      data: { dormId: dorm.id, totalAmount: Number((Math.random() * 980 + 20).toFixed(2)), description: `D0003 压测账单 #${i + 1}`, category: randomFrom(categories), customCategory: null, createdBy: leader.id, createdAt: date },
      select: { id: true },
    });
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const pick = shuffled.slice(0, randInt(Math.min(2, users.length), users.length));
    await prisma.billParticipant.createMany({ data: pick.map((u) => ({ billId: bill.id, userId: u.id, paid: Math.random() > 0.35 })) });
  }

  console.log('create unread chat notifications...');
  const notifications = [];
  for (const user of users) {
    for (let i = 0; i < 120; i += 1) {
      const date = new Date(start.getTime() + Math.floor(Math.random() * (now.getTime() - start.getTime())));
      notifications.push({ dormId: dorm.id, userId: user.id, type: 'chat', title: `群消息提醒 #${i + 1}`, content: '有新的聊天消息', targetPath: '/chat', groupKey: null, unreadCount: randInt(1, 6), isRead: false, createdAt: date, updatedAt: date });
    }
  }
  for (let i = 0; i < notifications.length; i += 1000) await prisma.notification.createMany({ data: notifications.slice(i, i + 1000) });

  const [billCount, chatCount, dutyCount] = await Promise.all([
    prisma.bill.count({ where: { dormId: dorm.id } }),
    prisma.chatMessage.count({ where: { dormId: dorm.id } }),
    prisma.duty.count({ where: { dormId: dorm.id } }),
  ]);
  console.log({ dormId: dorm.id, billCount, chatCount, dutyCount });
}

run().then(async () => { await prisma.$disconnect(); console.log('D0003 heavy seed done'); }).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
