import { describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db';
import { ingestRadarStatus, loginOrRegister, listNotifications, listStatus } from '@/lib/services';
import type { SessionUser } from '@/lib/types';

function toSession(result: { userId: number; dormId: number; isLeader: boolean }): SessionUser {
  return {
    userId: result.userId,
    dormId: result.dormId,
    isLeader: result.isLeader,
  };
}

describe('radar ingest service', () => {
  it('updates mapped user status and reflects in status module', async () => {
    const leader = await loginOrRegister('雷达舍长', 'radarleader@campus.edu.cn');
    const member = await loginOrRegister('雷达成员', 'radarmember@campus.edu.cn', leader.inviteCode);

    const ingestResult = await ingestRadarStatus({
      device_id: `DORM_${member.userId}`,
      status: 'Studying',
      target_state: 2,
      motion_distance: 0,
      static_distance: 180,
      motion_energy: 0,
      static_energy: 30,
      detect_distance: 200,
      light_sensor: 96,
    });

    expect(ingestResult.accepted).toBe(true);
    expect(ingestResult.updated).toBe(true);
    expect(ingestResult.userId).toBe(member.userId);
    expect(ingestResult.state).toBe('study');

    const statusRows = await listStatus(toSession(leader));
    const target = statusRows.find((item) => item.userId === member.userId);
    expect(target?.state).toBe('study');
  });

  it('pushes notification when out but light remains high', async () => {
    const leader = await loginOrRegister('雷达舍长2', 'radarleader2@campus.edu.cn');
    const member = await loginOrRegister('雷达成员2', 'radarmember2@campus.edu.cn', leader.inviteCode);

    await ingestRadarStatus({
      device_id: `DORM_${member.userId}`,
      status: 'Out',
      target_state: 0,
      motion_distance: 0,
      static_distance: 0,
      motion_energy: 0,
      static_energy: 0,
      detect_distance: 200,
      light_sensor: 180,
    });

    const list = await listNotifications(leader.dormId, leader.userId, 'all', { limit: 20 });
    const hit = list.items.find((item) => item.type === 'radar_alert');
    expect(hit).toBeTruthy();
    expect(hit?.title).toContain('雷达');
  });

  it('accepts unknown device without affecting any module data', async () => {
    const leader = await loginOrRegister('雷达舍长3', 'radarleader3@campus.edu.cn');
    await loginOrRegister('雷达成员3', 'radarmember3@campus.edu.cn', leader.inviteCode);

    const beforeStatusCount = await prisma.status.count();
    const beforeNoticeCount = await prisma.notification.count();

    const result = await ingestRadarStatus({
      device_id: 'DORM_UNKNOWN_BED_A',
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
    expect(result.reason).toBeTruthy();

    const afterStatusCount = await prisma.status.count();
    const afterNoticeCount = await prisma.notification.count();
    expect(afterStatusCount).toBe(beforeStatusCount);
    expect(afterNoticeCount).toBe(beforeNoticeCount);
  });
});
