/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function postRadar(payload) {
  const resp = await fetch(`${baseUrl}/api/radar/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  return { status: resp.status, body };
}

async function ensureSeedData() {
  const count = await prisma.user.count();
  if (count > 0) return;
  const dorm = await prisma.dorm.create({
    data: {
      name: 'Radar 测试宿舍',
      inviteCode: `RADAR${Date.now()}`,
    },
  });
  await prisma.user.createMany({
    data: [
      { name: '测试舍长', email: `leader_${Date.now()}@test.local`, dormId: dorm.id, isLeader: true },
      { name: '测试成员', email: `member_${Date.now()}@test.local`, dormId: dorm.id, isLeader: false },
    ],
  });
}

async function assertRadarEffects() {
  await ensureSeedData();
  await import('../scripts/seed-user-devices.cjs');

  const users = await prisma.user.findMany({ select: { id: true, dormId: true }, orderBy: { id: 'asc' } });
  const target = users[0];
  if (!target) throw new Error('no users found');

  const first = await postRadar({
    device_id: `DORM_${target.id}`,
    status: 'Studying',
    target_state: 2,
    motion_distance: 0,
    static_distance: 180,
    motion_energy: 0,
    static_energy: 20,
    detect_distance: 200,
    light_sensor: 80,
  });
  if (first.status !== 200 || first.body?.code !== 200) {
    throw new Error(`first request failed: ${JSON.stringify(first)}`);
  }

  const statusRow = await prisma.status.findUnique({ where: { userId: target.id } });
  if (!statusRow || statusRow.state !== 'study') {
    throw new Error(`status not updated correctly: ${JSON.stringify(statusRow)}`);
  }

  const second = await postRadar({
    device_id: `DORM_${target.id}`,
    status: 'Out',
    target_state: 0,
    motion_distance: 0,
    static_distance: 0,
    motion_energy: 0,
    static_energy: 0,
    detect_distance: 200,
    light_sensor: 200,
  });
  if (second.status !== 200 || second.body?.code !== 200) {
    throw new Error(`second request failed: ${JSON.stringify(second)}`);
  }

  const alerts = await prisma.notification.findMany({
    where: {
      dormId: target.dormId,
      type: 'radar_alert',
    },
  });
  if (alerts.length === 0) {
    throw new Error('expected radar_alert notification but got none');
  }

  console.log(JSON.stringify({
    ok: true,
    userId: target.id,
    statusAfterFirst: statusRow.state,
    alertCount: alerts.length,
  }, null, 2));
}

assertRadarEffects()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
