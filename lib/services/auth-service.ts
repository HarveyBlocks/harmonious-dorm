import { INVITE_CODE_LENGTH } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { LoginResult } from '@/lib/types';

import { normalizeEmail, normalizeInviteCode, normalizeName } from './helpers';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomInviteCode(length: number): string {
  let output = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
    output += INVITE_CODE_ALPHABET[idx];
  }
  return output;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    const candidate = randomInviteCode(INVITE_CODE_LENGTH);
    const exists = await prisma.dorm.findUnique({ where: { inviteCode: candidate } });
    if (!exists) {
      return candidate;
    }
  }
  throw new ApiError(500, '邀请码生成失败，请重试');
}

async function createDormAndLeader(name: string, email: string): Promise<LoginResult> {
  const inviteCode = await generateUniqueInviteCode();
  const dormName = `宿舍-${inviteCode}`;

  const result = await prisma.$transaction(async (tx) => {
    const dorm = await tx.dorm.create({
      data: {
        name: dormName,
        inviteCode,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name,
        dormId: dorm.id,
        isLeader: true,
      },
    });

    await tx.status.upsert({
      where: { userId: user.id },
      create: { userId: user.id, state: '外出' },
      update: {},
    });

    return { user, dorm };
  });

  return {
    userId: result.user.id,
    dormId: result.dorm.id,
    isLeader: result.user.isLeader,
    inviteCode: result.dorm.inviteCode,
  };
}

function buildDefaultName(email: string): string {
  const localPart = email.split('@')[0]?.trim() || '';
  const normalized = localPart.replace(/\s+/g, '').slice(0, 20);
  if (normalized) {
    return normalized;
  }
  const suffix = Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, '0');
  return `用户${suffix}`;
}

export async function loginOrRegister(
  nameInput: string | undefined,
  emailInput: string,
  inviteCodeInput?: string,
  mode: 'login' | 'register' = 'register',
): Promise<LoginResult> {
  const email = normalizeEmail(emailInput);
  const name = normalizeName(nameInput || '');
  const defaultName = buildDefaultName(email);
  if (!email) {
    throw new ApiError(400, '邮箱不能为空');
  }

  const existedByEmail = await prisma.user.findUnique({
    where: { email },
    include: { dorm: true },
  });
  if (existedByEmail) {
    if (name && existedByEmail.name !== name) {
      await prisma.user.update({
        where: { id: existedByEmail.id },
        data: { name },
      });
    }

    await prisma.status.upsert({
      where: { userId: existedByEmail.id },
      create: { userId: existedByEmail.id, state: '外出' },
      update: {},
    });

    return {
      userId: existedByEmail.id,
      dormId: existedByEmail.dormId,
      isLeader: existedByEmail.isLeader,
      inviteCode: existedByEmail.dorm.inviteCode,
    };
  }
  if (mode === 'login') {
    throw new ApiError(404, '该邮箱未注册，请先注册');
  }

  const inviteCode = normalizeInviteCode(inviteCodeInput);
  if (!inviteCode) {
    return createDormAndLeader(name || defaultName, email);
  }

  const dorm = await prisma.dorm.findUnique({ where: { inviteCode } });
  if (!dorm) {
    throw new ApiError(404, '邀请码不存在');
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: name || defaultName,
      dormId: dorm.id,
      isLeader: false,
    },
  });

  await prisma.status.upsert({
    where: { userId: user.id },
    create: { userId: user.id, state: '外出' },
    update: {},
  });

  return {
    userId: user.id,
    dormId: dorm.id,
    isLeader: user.isLeader,
    inviteCode: dorm.inviteCode,
  };
}
