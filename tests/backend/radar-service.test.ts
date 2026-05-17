import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import { ingestRadarStatus, loginOrRegister, markOfflineDevices } from '@/lib/services';
import type { SessionUser } from '@/lib/types';

function toSession(result: { userId: number; dormId: number; isLeader: boolean }): SessionUser {
  return { userId: result.userId, dormId: result.dormId, isLeader: result.isLeader };
}

async function ensureDevice(userId: number, dormId: number, token?: string) {
  await prisma.device.upsert({
    where: { deviceId: `DORM_${userId}` },
    create: {
      userId,
      dormId,
      deviceId: `DORM_${userId}`,
      name: `U${userId}雷达`,
      authToken: token || null,
      enabled: true,
    },
    update: {
      userId,
      dormId,
      authToken: token || null,
      enabled: true,
    },
  });
}

describe('radar ingest service advanced', () => {
  it('creates N+1 devices by seed script rule', async () => {
    const leader = await loginOrRegister('N1舍长', 'n1leader@campus.edu.cn');
    await loginOrRegister('N1成员A', 'n1a@campus.edu.cn', leader.inviteCode);
    await loginOrRegister('N1成员B', 'n1b@campus.edu.cn', leader.inviteCode);

    const users = await prisma.user.findMany({
      where: { dormId: leader.dormId },
      select: { id: true, name: true, dormId: true },
    });
    for (const user of users) {
      await prisma.device.upsert({
        where: { deviceId: `DORM_${user.id}` },
        create: {
          userId: user.id,
          dormId: user.dormId,
          deviceId: `DORM_${user.id}`,
          name: `${user.name} 的雷达设备`,
          kind: 'radar',
          enabled: true,
        },
        update: { enabled: true, kind: 'radar' },
      });
    }
    await prisma.device.upsert({
      where: { deviceId: `DUTY_${leader.dormId}` },
      create: {
        userId: leader.userId,
        dormId: leader.dormId,
        deviceId: `DUTY_${leader.dormId}`,
        name: '值日设备',
        kind: 'duty_sensor',
        enabled: true,
      },
      update: { enabled: true, kind: 'duty_sensor' },
    });

    const userCount = await prisma.user.count({ where: { dormId: leader.dormId } });
    const deviceCount = await prisma.device.count({ where: { dormId: leader.dormId } });
    expect(deviceCount).toBe(userCount + 1);

    const duty = await prisma.device.findUnique({ where: { deviceId: `DUTY_${leader.dormId}` } });
    expect(duty).toBeTruthy();
    expect(duty?.kind).toBe('duty_sensor');
  });

  it('updates status only after smoothing threshold', async () => {
    const leader = await loginOrRegister('S舍长', 'smoothleader@campus.edu.cn');
    const member = await loginOrRegister('S成员', 'smoothmember@campus.edu.cn', leader.inviteCode);
    await ensureDevice(member.userId, member.dormId);

    const p = {
      device_id: `DORM_${member.userId}` as const,
      status: 'Studying' as const,
      target_state: 2,
      motion_distance: 0,
      static_distance: 170,
      motion_energy: 0,
      static_energy: 20,
      detect_distance: 200,
      light_sensor: 80,
    };

    const r1 = await ingestRadarStatus(p);
    expect(r1.changed).toBe(false);
    const s1 = await prisma.status.findUnique({ where: { userId: member.userId } });
    expect(s1?.state ?? 'out').toBe('out');

    const r2 = await ingestRadarStatus(p);
    expect(r2.changed).toBe(false);
    const s2 = await prisma.status.findUnique({ where: { userId: member.userId } });
    expect(s2?.state ?? 'out').toBe('out');

    const r3 = await ingestRadarStatus(p);
    expect(r3.changed).toBe(true);
    const s3 = await prisma.status.findUnique({ where: { userId: member.userId } });
    expect(s3?.state).toBe('study');
  });

  it('writes latest and history tables for each ingest', async () => {
    const leader = await loginOrRegister('L舍长', 'latestleader@campus.edu.cn');
    await ensureDevice(leader.userId, leader.dormId);

    await ingestRadarStatus({
      device_id: `DORM_${leader.userId}`,
      status: 'Out',
      target_state: 0,
      motion_distance: 0,
      static_distance: 0,
      motion_energy: 0,
      static_energy: 0,
      detect_distance: 200,
      light_sensor: 180,
    });

    const latest = await prisma.deviceLatestStatus.findUnique({
      where: { deviceId: `DORM_${leader.userId}` },
    });
    expect(latest).toBeTruthy();
    expect(latest?.status).toBe('Out');

    const historyCount = await prisma.statusHistory.count({
      where: { deviceId: `DORM_${leader.userId}` },
    });
    expect(historyCount).toBeGreaterThan(0);
  });

  it('enforces auth token when device has token', async () => {
    const leader = await loginOrRegister('T舍长', 'tokenleader@campus.edu.cn');
    await ensureDevice(leader.userId, leader.dormId, 'secret-1');

    await expect(
      ingestRadarStatus(
        {
          device_id: `DORM_${leader.userId}`,
          status: 'Out',
          target_state: 0,
          motion_distance: 0,
          static_distance: 0,
          motion_energy: 0,
          static_energy: 0,
          detect_distance: 200,
          light_sensor: 60,
        },
        { authToken: 'wrong-token' },
      ),
    ).rejects.toBeInstanceOf(ApiError);

    const ok = await ingestRadarStatus(
      {
        device_id: `DORM_${leader.userId}`,
        status: 'Out',
        target_state: 0,
        motion_distance: 0,
        static_distance: 0,
        motion_energy: 0,
        static_energy: 0,
        detect_distance: 200,
        light_sensor: 60,
      },
      { authToken: 'secret-1' },
    );
    expect(ok.accepted).toBe(true);
  });

  it('marks stale heartbeat device as offline(out)', async () => {
    const leader = await loginOrRegister('O舍长', 'offlineleader@campus.edu.cn');
    const member = await loginOrRegister('O成员', 'offlinemember@campus.edu.cn', leader.inviteCode);
    await ensureDevice(member.userId, member.dormId);

    await prisma.status.upsert({
      where: { userId: member.userId },
      create: { userId: member.userId, state: 'study' },
      update: { state: 'study' },
    });
    await prisma.device.update({
      where: { deviceId: `DORM_${member.userId}` },
      data: { lastHeartbeat: new Date(Date.now() - 60_000) },
    });

    const result = await markOfflineDevices();
    expect(result.checked).toBeGreaterThan(0);
    expect(result.marked).toBeGreaterThan(0);

    const row = await prisma.status.findUnique({ where: { userId: member.userId } });
    expect(row?.state).toBe('out');
  });

  it('rejects unknown formatted device id mapping', async () => {
    const leader = await loginOrRegister('U舍长', 'unknownleader@campus.edu.cn');
    const _session = toSession(leader);
    const result = await ingestRadarStatus({
      device_id: 'DORM_ABC_100_X',
      status: 'Gaming',
      target_state: 3,
      motion_distance: 120,
      static_distance: 0,
      motion_energy: 80,
      static_energy: 0,
      detect_distance: 250,
      light_sensor: 120,
    });
    expect(result.accepted).toBe(true);
    expect(result.updated).toBe(false);
  });

  it('duty sensor marks duty completed when light>=20 and person detected', async () => {
    const leader = await loginOrRegister('D舍长', 'dutysensorleader@campus.edu.cn');
    const member = await loginOrRegister('D成员', 'dutysensormember@campus.edu.cn', leader.inviteCode);

    const today = new Date().toISOString().slice(0, 10);
    const dutyRow = await prisma.duty.create({
      data: {
        dormId: leader.dormId,
        userId: member.userId,
        date: today,
        task: 'sweep floor',
        completed: false,
      },
    });

    await ensureDevice(leader.userId, leader.dormId);
    await prisma.device.upsert({
      where: { deviceId: `DUTY_${leader.dormId}` },
      create: {
        userId: leader.userId,
        dormId: leader.dormId,
        deviceId: `DUTY_${leader.dormId}`,
        name: '值日设备',
        kind: 'duty_sensor',
        enabled: true,
      },
      update: { enabled: true, kind: 'duty_sensor' },
    });

    const result = await ingestRadarStatus({
      device_id: `DUTY_${leader.dormId}`,
      status: 'Unknown',
      target_state: 1,
      motion_distance: 50,
      static_distance: 30,
      motion_energy: 55,
      static_energy: 20,
      detect_distance: 100,
      light_sensor: 30,
    });

    expect((result as any).mode).toBe('duty_sensor');
    expect((result as any).dutyDetected).toBe(true);

    const updated = await prisma.duty.findUnique({ where: { id: dutyRow.id } });
    expect(updated?.completed).toBe(true);
  });
});
