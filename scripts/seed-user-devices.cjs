/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function buildDeviceId(userId) {
  return `DORM_${userId}`;
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      dormId: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const existed = await prisma.device.findFirst({
      where: {
        userId: user.id,
      },
      select: { id: true },
    });

    if (existed) {
      skipped += 1;
      continue;
    }

    await prisma.device.create({
      data: {
        userId: user.id,
        dormId: user.dormId,
        deviceId: buildDeviceId(user.id),
        name: `${user.name} 的雷达设备`,
        kind: 'radar',
        enabled: true,
      },
    });
    created += 1;
  }

  const dorms = await prisma.dorm.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  let dutyCreated = 0;
  let dutySkipped = 0;
  for (const dorm of dorms) {
    const dutyDeviceId = `DUTY_${dorm.id}`;
    const existed = await prisma.device.findUnique({
      where: { deviceId: dutyDeviceId },
      select: { id: true },
    });
    if (existed) {
      dutySkipped += 1;
      continue;
    }
    const leader = await prisma.user.findFirst({
      where: { dormId: dorm.id, isLeader: true },
      select: { id: true },
    });
    const fallbackUser = leader || (await prisma.user.findFirst({ where: { dormId: dorm.id }, select: { id: true } }));
    if (!fallbackUser) continue;
    await prisma.device.create({
      data: {
        userId: fallbackUser.id,
        dormId: dorm.id,
        deviceId: dutyDeviceId,
        name: `${dorm.name} 值日传感器`,
        kind: 'duty_sensor',
        enabled: true,
      },
    });
    dutyCreated += 1;
  }

  const totalDevices = await prisma.device.count();

  console.log(JSON.stringify({
    totalUsers: users.length,
    created,
    skipped,
    totalDorms: dorms.length,
    dutyCreated,
    dutySkipped,
    totalDevices,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
