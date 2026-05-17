/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, dormId: true },
  });

  const devices = await prisma.device.findMany({
    select: { id: true, userId: true, dormId: true, deviceId: true, enabled: true },
  });

  const byUser = new Map();
  for (const item of devices) {
    const list = byUser.get(item.userId) || [];
    list.push(item);
    byUser.set(item.userId, list);
  }

  const missing = [];
  const crossDormMismatch = [];
  for (const user of users) {
    const list = byUser.get(user.id) || [];
    if (list.length === 0) {
      missing.push(user);
      continue;
    }
    for (const device of list) {
      if (device.dormId !== user.dormId) {
        crossDormMismatch.push({
          userId: user.id,
          userDormId: user.dormId,
          deviceId: device.deviceId,
          deviceDormId: device.dormId,
        });
      }
    }
  }

  const duplicateDeviceIds = await prisma.device.groupBy({
    by: ['deviceId'],
    _count: { _all: true },
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  const summary = {
    totalUsers: users.length,
    totalDevices: devices.length,
    missingUsersCount: missing.length,
    crossDormMismatchCount: crossDormMismatch.length,
    duplicateDeviceIdCount: duplicateDeviceIds.length,
  };

  console.log(JSON.stringify({ summary, missing, crossDormMismatch, duplicateDeviceIds }, null, 2));

  if (missing.length > 0 || crossDormMismatch.length > 0 || duplicateDeviceIds.length > 0) {
    process.exit(2);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
