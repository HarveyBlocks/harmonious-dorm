import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach } from 'vitest';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./test.db',
  SESSION_SECRET: 'harmonious-dorm-test-secret',
});

const projectRoot = path.resolve(__dirname, '..', '..');

beforeAll(async () => {
  const testDbPath = path.join(projectRoot, 'prisma', 'test.db');
  if (!fs.existsSync(testDbPath)) {
    fs.writeFileSync(testDbPath, '');
  }

  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: 'file:./test.db',
    },
  });
}, 60000);

beforeEach(async () => {
  const { prisma } = await import('@/lib/db');

  await prisma.billParticipant.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.duty.deleteMany();
  await prisma.status.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dorm.deleteMany();
});

afterAll(async () => {
  const { prisma } = await import('@/lib/db');
  await prisma.$disconnect();
});
