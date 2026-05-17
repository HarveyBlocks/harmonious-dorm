import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
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

type IngestOptions = {
  authToken?: string | null;
};

const RADAR_STATUS_TO_DORM_STATE: Record<RadarPayload['status'], DormStateCode> = {
  Out: 'out',
  Sleeping: 'sleep',
  Studying: 'study',
  Gaming: 'game',
  Unknown: 'out',
};

const SMOOTHING_THRESHOLD = 3;
const OFFLINE_SECONDS = 5;
const STATUS_HISTORY_RETENTION_DAYS = 30;

function normalizeRadarState(status: RadarPayload['status']): DormStateCode {
  return normalizeDormState(RADAR_STATUS_TO_DORM_STATE[status]);
}

function parseUserIdFromDeviceId(deviceId: string): number | null {
  const direct = deviceId.match(/^DORM_(\d+)$/);
  if (!direct || !direct[1]) return null;
  const parsed = Number.parseInt(direct[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function ingestRadarStatus(payload: RadarPayload, options?: IngestOptions) {
  const device = await prisma.device.findUnique({
    where: { deviceId: payload.device_id },
    select: { id: true, userId: true, dormId: true, enabled: true, authToken: true },
  });

  if (!device) {
    return { accepted: true, updated: false, reason: 'device_not_registered' as const };
  }
  if (!device.enabled) {
    return { accepted: true, updated: false, reason: 'device_disabled' as const, userId: user.id };
  }
  if (device.authToken && options?.authToken !== device.authToken) {
    throw new ApiError(401, 'Invalid radar device token', { code: 'device.auth.invalid' });
  }

  if (payload.device_id.startsWith('DUTY_')) {
    const hasPerson = payload.target_state !== 0;
    const light = payload.light_sensor ?? -1;
    const detectedOnDuty = light >= 20 && hasPerson;
    const dutyBlocked = light >= 0 && light < 20;

    const today = new Date().toISOString().slice(0, 10);
    if (detectedOnDuty) {
      const todayDuty = await prisma.duty.findFirst({
        where: { dormId: device.dormId, date: today },
        orderBy: { id: 'asc' },
      });
      if (todayDuty && !todayDuty.completed) {
        await prisma.duty.update({
          where: { id: todayDuty.id },
          data: { completed: true },
        });
      }
      emitToDorm(device.dormId, 'duty:detected', {
        date: today,
        state: 'detected',
        deviceId: payload.device_id,
        lightSensor: light,
      });
      await pushDormNotification({
        dormId: device.dormId,
        type: 'duty_sensor',
        title: '值日检测提醒',
        content: `检测到有人值日（光敏值 ${light}）`,
        targetPath: '/',
        groupKey: `duty_detected_${device.dormId}_${today}`,
      });
    } else if (dutyBlocked) {
      emitToDorm(device.dormId, 'duty:detected', {
        date: today,
        state: 'blocked',
        deviceId: payload.device_id,
        lightSensor: light,
      });
      await pushDormNotification({
        dormId: device.dormId,
        type: 'duty_sensor',
        title: '值日设备遮挡',
        content: `值日设备疑似被遮挡（光敏值 ${light}）`,
        targetPath: '/',
        groupKey: `duty_blocked_${device.dormId}_${today}`,
      });
    }

    return {
      accepted: true,
      updated: true,
      mode: 'duty_sensor',
      dutyDetected: detectedOnDuty,
      dutyBlocked,
    };
  }

  const mappedUserId = parseUserIdFromDeviceId(payload.device_id);
  if (!mappedUserId) {
    return { accepted: true, updated: false, reason: 'device_id_not_mapped' as const };
  }
  if (device.userId !== mappedUserId) {
    return { accepted: true, updated: false, reason: 'device_user_mismatch' as const, userId: mappedUserId };
  }

  const user = await prisma.user.findUnique({
    where: { id: mappedUserId },
    select: { id: true, name: true, dormId: true, status: true },
  });
  if (!user) {
    return { accepted: true, updated: false, reason: 'user_not_found' as const, userId: mappedUserId };
  }
  const mappedState = normalizeRadarState(payload.status);

  const now = new Date();
  await prisma.device.update({
    where: { id: device.id },
    data: { lastHeartbeat: now },
  });

  await prisma.deviceLatestStatus.upsert({
    where: { deviceId: payload.device_id },
    create: {
      deviceId: payload.device_id,
      dormId: user.dormId,
      userId: user.id,
      status: payload.status,
      targetState: payload.target_state,
      motionDistance: payload.motion_distance,
      staticDistance: payload.static_distance,
      motionEnergy: payload.motion_energy,
      staticEnergy: payload.static_energy,
      detectDistance: payload.detect_distance ?? null,
      lightSensor: payload.light_sensor ?? null,
      lastHeartbeat: now,
    },
    update: {
      dormId: user.dormId,
      userId: user.id,
      status: payload.status,
      targetState: payload.target_state,
      motionDistance: payload.motion_distance,
      staticDistance: payload.static_distance,
      motionEnergy: payload.motion_energy,
      staticEnergy: payload.static_energy,
      detectDistance: payload.detect_distance ?? null,
      lightSensor: payload.light_sensor ?? null,
      lastHeartbeat: now,
    },
  });

  await prisma.statusHistory.create({
    data: {
      deviceId: payload.device_id,
      dormId: user.dormId,
      userId: user.id,
      status: payload.status,
      targetState: payload.target_state,
      motionDistance: payload.motion_distance,
      staticDistance: payload.static_distance,
      motionEnergy: payload.motion_energy,
      staticEnergy: payload.static_energy,
      detectDistance: payload.detect_distance ?? null,
      lightSensor: payload.light_sensor ?? null,
      receivedAt: now,
    },
  });

  const recent = await prisma.statusHistory.findMany({
    where: { deviceId: payload.device_id },
    orderBy: { id: 'desc' },
    take: SMOOTHING_THRESHOLD,
    select: { status: true },
  });
  const shouldSwitch = recent.length >= SMOOTHING_THRESHOLD && recent.every((item) => normalizeRadarState(item.status as RadarPayload['status']) === mappedState);

  const previousState = normalizeDormState(user.status?.state);
  let changed = false;
  let finalState = previousState;
  if (shouldSwitch && previousState !== mappedState) {
    const status = await prisma.status.upsert({
      where: { userId: user.id },
      create: { userId: user.id, state: mappedState },
      update: { state: mappedState },
    });
    finalState = status.state as DormStateCode;
    changed = true;
    emitToDorm(user.dormId, 'status:changed', {
      userId: user.id,
      state: status.state,
      updatedAt: status.updatedAt.toISOString(),
      source: 'radar',
      deviceId: payload.device_id,
    });
  }

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

  return {
    accepted: true,
    updated: true,
    userId: user.id,
    dormId: user.dormId,
    previousState,
    state: finalState,
    changed,
    smoothingApplied: shouldSwitch,
  };
}

export async function markOfflineDevices() {
  const threshold = new Date(Date.now() - OFFLINE_SECONDS * 1000);
  const staleDevices = await prisma.device.findMany({
    where: {
      enabled: true,
      OR: [{ lastHeartbeat: null }, { lastHeartbeat: { lt: threshold } }],
    },
    select: { id: true, deviceId: true, userId: true, dormId: true },
  });
  let marked = 0;
  for (const device of staleDevices) {
    const current = await prisma.status.findUnique({ where: { userId: device.userId }, select: { state: true } });
    const normalized = normalizeDormState(current?.state);
    if (normalized !== 'out') {
      await prisma.status.upsert({
        where: { userId: device.userId },
        create: { userId: device.userId, state: 'out' },
        update: { state: 'out' },
      });
      emitToDorm(device.dormId, 'status:changed', {
        userId: device.userId,
        state: 'out',
        source: 'radar-offline',
        deviceId: device.deviceId,
      });
      marked += 1;
    }
  }
  return { checked: staleDevices.length, marked };
}

export async function cleanupStatusHistory() {
  const cutoff = new Date(Date.now() - STATUS_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.statusHistory.deleteMany({
    where: { receivedAt: { lt: cutoff } },
  });
  return { deleted: result.count, cutoff: cutoff.toISOString() };
}
