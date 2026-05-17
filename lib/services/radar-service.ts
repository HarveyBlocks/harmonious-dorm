import { prisma } from '@/lib/db';
import { normalizeDormState, type DormStateCode } from '@/lib/domain-codes';
import { emitToDorm } from '@/lib/socket-server';
import { pushDormNotification } from './notification-service';

type RadarPayload = {
  device_id: string;
  status: 'Out' | 'Sleeping' | 'Studying' | 'Gaming' | 'Unknown';
  target_state: number;
  motion_distance: number;
  static_distance: number;
  motion_energy: number;
  static_energy: number;
  detect_distance?: number;
  light_sensor?: number;
};

const RADAR_STATUS_TO_DORM_STATE: Record<RadarPayload['status'], DormStateCode> = {
  Out: 'out',
  Sleeping: 'sleep',
  Studying: 'study',
  Gaming: 'game',
  Unknown: 'out',
};

function parseUserIdFromDeviceId(deviceId: string): number | null {
  const direct = deviceId.match(/^DORM_(\d+)$/);
  if (direct && direct[1]) {
    const directId = Number.parseInt(direct[1], 10);
    if (Number.isInteger(directId) && directId > 0) return directId;
  }
  return null;
}

export async function ingestRadarStatus(payload: RadarPayload) {
  const mappedState = normalizeDormState(RADAR_STATUS_TO_DORM_STATE[payload.status]);
  const userId = parseUserIdFromDeviceId(payload.device_id);
  if (!userId) {
    return {
      accepted: true,
      updated: false,
      reason: 'device_id_not_mapped',
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, dormId: true, status: true },
  });
  if (!user) {
    return {
      accepted: true,
      updated: false,
      reason: 'user_not_found',
      userId,
    };
  }

  const previousState = normalizeDormState(user.status?.state);
  const status = await prisma.status.upsert({
    where: { userId: user.id },
    create: { userId: user.id, state: mappedState },
    update: { state: mappedState },
  });

  emitToDorm(user.dormId, 'status:changed', {
    userId: user.id,
    state: status.state,
    updatedAt: status.updatedAt.toISOString(),
    source: 'radar',
    deviceId: payload.device_id,
  });

  const lightSensor = payload.light_sensor;
  if (lightSensor !== undefined && mappedState === 'out' && lightSensor > 100) {
    await pushDormNotification({
      dormId: user.dormId,
      type: 'radar_alert',
      title: '雷达异常提醒',
      content: `${user.name} 当前不在宿舍，但检测到灯光较亮（${lightSensor}）`,
      targetPath: '/status',
      groupKey: `radar_out_light_${user.id}`,
      actorUserId: user.id,
    });
  }

  if (lightSensor !== undefined && mappedState === 'sleep' && lightSensor > 150) {
    await pushDormNotification({
      dormId: user.dormId,
      type: 'radar_alert',
      title: '睡眠状态异常',
      content: `${user.name} 处于睡眠状态，但灯光较亮（${lightSensor}）`,
      targetPath: '/status',
      groupKey: `radar_sleep_light_${user.id}`,
      actorUserId: user.id,
    });
  }

  const changed = previousState !== mappedState;
  return {
    accepted: true,
    updated: true,
    userId: user.id,
    dormId: user.dormId,
    previousState,
    state: mappedState,
    changed,
  };
}
