/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const START_DATE = new Date('2023-03-14T00:00:00.000Z');
const END_DATE = new Date('2026-03-14T00:00:00.000Z');
const DORM_COUNT = 20;
const DORM_SIZES = [2, 3, 4, ...Array.from({ length: 11 }).map(() => 5), ...Array.from({ length: 6 }).map(() => 6)];
const STATUS_STATES = ['学习', '睡觉', '游戏', '外出'];
const BILL_CATEGORIES = ['电费', '水费', '网费', '日用品', '其他'];
const NAME_POOL = ['张伟', '王芳', '李娜', '刘洋', '陈晨', '杨帆', '黄涛', '赵敏', '周杰', '吴迪', '郑爽', '孙悦'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randomDateBetween(start, end) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function fmtDate(d) {
  return `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${`${d.getUTCDate()}`.padStart(2, '0')}`;
}

async function resetDb() {
  await prisma.billParticipant.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.status.deleteMany();
  await prisma.duty.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dorm.deleteMany();
}

async function seed() {
  console.log('reset database...');
  await resetDb();

  console.log('create dorms...');
  const dorms = [];
  for (let i = 0; i < DORM_COUNT; i += 1) {
    const dorm = await prisma.dorm.create({
      data: {
        name: `宿舍-${`${i + 1}`.padStart(2, '0')}`,
        inviteCode: `D${`${i + 1}`.padStart(4, '0')}`,
      },
    });
    dorms.push(dorm);
  }

  console.log('create users...');
  let emailSeq = 1;
  for (let i = 0; i < dorms.length; i += 1) {
    const dorm = dorms[i];
    const size = DORM_SIZES[i] || 5;
    for (let j = 0; j < size; j += 1) {
      await prisma.user.create({
        data: {
          dormId: dorm.id,
          email: `stu${`${emailSeq}`.padStart(4, '0')}@campus.edu.cn`,
          name: randomFrom(NAME_POOL),
          isLeader: j === 0,
          language: randomFrom(['zh-CN', 'zh-TW', 'fr', 'en']),
        },
      });
      emailSeq += 1;
    }
  }

  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
  });
  const usersByDorm = new Map();
  for (const user of users) {
    const list = usersByDorm.get(user.dormId) || [];
    list.push(user);
    usersByDorm.set(user.dormId, list);
  }

  console.log('create status...');
  await prisma.status.createMany({
    data: users.map((u) => ({
      userId: u.id,
      state: randomFrom(STATUS_STATES),
      updatedAt: randomDateBetween(START_DATE, END_DATE),
    })),
  });

  console.log('create duties...');
  const duties = [];
  for (const dorm of dorms) {
    const members = usersByDorm.get(dorm.id);
    let cursor = new Date(START_DATE);
    let weekIdx = 0;
    while (cursor <= END_DATE) {
      for (let day = 0; day < 5; day += 1) {
        const date = new Date(cursor);
        date.setUTCDate(cursor.getUTCDate() + day);
        if (date > END_DATE) continue;
        const member = members[(weekIdx + day) % members.length];
        duties.push({
          dormId: dorm.id,
          userId: member.id,
          date: fmtDate(date),
          completed: Math.random() > 0.35,
          imageUrl: null,
          createdAt: date,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7);
      weekIdx += 1;
    }
  }
  for (let i = 0; i < duties.length; i += 1000) {
    await prisma.duty.createMany({ data: duties.slice(i, i + 1000) });
  }

  console.log('create bills + bill participants...');
  for (const dorm of dorms) {
    const members = usersByDorm.get(dorm.id);
    const leader = members.find((u) => u.isLeader) || members[0];
    for (let y = 2023; y <= 2026; y += 1) {
      const monthMax = y === 2026 ? 3 : 12;
      const monthStart = y === 2023 ? 3 : 1;
      for (let m = monthStart; m <= monthMax; m += 1) {
        for (let k = 0; k < 5; k += 1) {
          const d = randInt(1, 26);
          const createdAt = new Date(Date.UTC(y, m - 1, d, randInt(0, 23), randInt(0, 59), randInt(0, 59)));
          const bill = await prisma.bill.create({
            data: {
              dormId: dorm.id,
              totalAmount: Number((Math.random() * 980 + 20).toFixed(2)),
              description: `消费-${y}${`${m}`.padStart(2, '0')}-${k + 1}`,
              category: randomFrom(BILL_CATEGORIES),
              customCategory: null,
              createdBy: leader.id,
              createdAt,
            },
          });
          const size = randInt(Math.min(2, members.length), members.length);
          const shuffled = [...members].sort(() => Math.random() - 0.5).slice(0, size);
          await prisma.billParticipant.createMany({
            data: shuffled.map((u) => ({
              billId: bill.id,
              userId: u.id,
              paid: Math.random() > 0.25,
            })),
          });
        }
      }
    }
  }

  console.log('create chats...');
  const chats = [];
  for (const dorm of dorms) {
    const members = usersByDorm.get(dorm.id);
    for (let i = 0; i < 400; i += 1) {
      const user = randomFrom(members);
      chats.push({
        dormId: dorm.id,
        userId: user.id,
        content: `消息-${dorm.id}-${i + 1}`,
        createdAt: randomDateBetween(START_DATE, END_DATE),
      });
    }
  }
  for (let i = 0; i < chats.length; i += 1000) {
    await prisma.chatMessage.createMany({ data: chats.slice(i, i + 1000) });
  }

  console.log('create notifications...');
  const notifications = [];
  for (const dorm of dorms) {
    const members = usersByDorm.get(dorm.id);
    for (let i = 0; i < 220; i += 1) {
      const user = randomFrom(members);
      notifications.push({
        dormId: dorm.id,
        userId: user.id,
        type: randomFrom(['chat', 'bill', 'duty', 'dorm']),
        title: `通知-${dorm.id}-${i + 1}`,
        content: `这是一条通知内容-${dorm.id}-${i + 1}`,
        targetPath: '/',
        groupKey: randomFrom(['chat', 'bill', 'duty', 'dorm']),
        unreadCount: randInt(1, 5),
        isRead: Math.random() > 0.5,
        createdAt: randomDateBetween(START_DATE, END_DATE),
        updatedAt: randomDateBetween(START_DATE, END_DATE),
      });
    }
  }
  for (let i = 0; i < notifications.length; i += 1000) {
    await prisma.notification.createMany({ data: notifications.slice(i, i + 1000) });
  }

  const dormCount = await prisma.dorm.count();
  const userCount = await prisma.user.count();
  const dutyCount = await prisma.duty.count();
  const billCount = await prisma.bill.count();
  const chatCount = await prisma.chatMessage.count();
  console.log({ dormCount, userCount, dutyCount, billCount, chatCount });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    console.log('seed finished.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
