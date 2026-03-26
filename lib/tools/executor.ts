import { ApiError } from '@/lib/errors';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import {
  assignDuty,
  completeDuty,
  createBill,
  deleteBill,
  deleteDuty,
  getMe,
  listBills,
  listDuties,
  transferLeader,
  updateDormBotName,
  updateDormBotSettings,
  updateDormName,
  updateMemberDescriptions,
  updateMyName,
  markBillPaid,
  pushDormNotification,
} from '@/lib/services';
import { listDormBotSettingsSafe } from '@/lib/services/bot-settings-service';
import type { SessionUser } from '@/lib/types';

import { runMultiplyTool } from './multiply-tool';
import { TOOL_DESCRIPTOR_MAP } from './registry';
import type { ToolExecuteFailure, ToolExecuteSuccess, ToolExecutionContext, ToolPermission } from './types';

function toSession(ctx: ToolExecutionContext): SessionUser {
  return { userId: ctx.callerUserId, dormId: ctx.dormId, isLeader: ctx.callerIsLeader };
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as Record<string, unknown>;
}

function denied(code: ToolExecuteFailure['errorCode'], error: string): ToolExecuteFailure {
  return { ok: false, errorCode: code, error };
}

function checkToolPermission(name: string, rawArgs: unknown, context: ToolExecutionContext): ToolExecuteFailure | null {
  const descriptor = TOOL_DESCRIPTOR_MAP.get(name);
  if (!descriptor) return denied('unsupported_tool', 'Unsupported tool');
  if (descriptor.operationScope === 'leader' && !context.callerIsLeader) {
    return denied('permission_required_leader', 'Leader permission required');
  }
  if (descriptor.operationScope !== 'self_or_leader') return null;

  const args = asRecord(rawArgs);
  const targetUserId = Number(args?.userId);
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) return null;
  if (targetUserId === context.callerUserId || context.callerIsLeader) return null;
  return denied('permission_required_self_or_leader', 'Only self or leader can run this operation');
}



async function notifyToolActionToOthers(name: string, args: Record<string, unknown>, session: SessionUser): Promise<void> {
  if (name === 'bill_create') {
    const total = Number(args.total || 0);
    await pushDormNotification({
      dormId: session.dormId,
      type: 'bill',
      title: encodeMessageToken(NoticeMessageKey.NewBillPublished),
      content: encodeMessageToken(NoticeMessageKey.BillSummary, { name: 'robot-tool', amount: Number.isFinite(total) ? total.toFixed(2) : '0.00' }),
      targetPath: '/wallet',
      groupKey: 'bot-tool-bill-create',
      actorUserId: session.userId,
    });
    return;
  }
  if (name === 'duty_create') {
    await pushDormNotification({
      dormId: session.dormId,
      type: 'duty',
      title: encodeMessageToken(NoticeMessageKey.DutyPublished),
      content: encodeMessageToken(NoticeMessageKey.DutyAssignedContent, { date: String(args.date || ''), task: String(args.task || '') }),
      targetPath: '/duty',
      groupKey: 'bot-tool-duty-create',
      actorUserId: session.userId,
    });
    return;
  }
  if (name === 'bot_settings_update_memory_window' || name === 'bot_settings_add_field' || name === 'bot_settings_remove_field' || name === 'bot_settings_update_name') {
    await pushDormNotification({
      dormId: session.dormId,
      type: 'settings',
      title: encodeMessageToken(NoticeMessageKey.DormInfoUpdated),
      content: encodeMessageToken(name === 'bot_settings_update_name' ? NoticeMessageKey.BotNameUpdated : NoticeMessageKey.DormInfoUpdated),
      targetPath: '/settings',
      groupKey: 'bot-tool-settings',
      actorUserId: session.userId,
    });
  }
}

async function runTool(name: string, args: Record<string, unknown>, session: SessionUser): Promise<unknown> {
  if (name === 'multiply') {
    const a = Number(args.a);
    const b = Number(args.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new ApiError(400, 'a and b must be numbers');
    return runMultiplyTool({ a, b });
  }
  if (name === 'bill_create') {
    return createBill(session, {
      total: Number(args.total),
      category: typeof args.category === 'string' ? args.category : undefined,
      customCategory: typeof args.customCategory === 'string' ? args.customCategory : undefined,
      participants: Array.isArray(args.participants) ? args.participants.map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0) : [],
    });
  }
  if (name === 'bill_delete') return deleteBill(session, Number(args.billId));
  if (name === 'bill_list') {
    return listBills(session, {
      limit: Number.isFinite(Number(args.limit)) ? Number(args.limit) : undefined,
      cursor: Number.isFinite(Number(args.cursor)) ? Number(args.cursor) : undefined,
    });
  }
  if (name === 'bill_mark_paid') return markBillPaid(session, Number(args.billId), Number.isFinite(Number(args.userId)) ? Number(args.userId) : undefined, true);
  if (name === 'bill_mark_unpaid') return markBillPaid(session, Number(args.billId), Number.isFinite(Number(args.userId)) ? Number(args.userId) : undefined, false);
  if (name === 'duty_create') return assignDuty(session, { userId: Number(args.userId), date: String(args.date || ''), task: String(args.task || '') });
  if (name === 'duty_delete') return deleteDuty(session, Number(args.dutyId));
  if (name === 'duty_list') {
    const scope = String(args.scope || 'all') === 'week' ? 'week' : 'all';
    return listDuties(session, {
      scope,
      limit: Number.isFinite(Number(args.limit)) ? Number(args.limit) : undefined,
      cursor: Number.isFinite(Number(args.cursor)) ? Number(args.cursor) : undefined,
    });
  }
  if (name === 'duty_mark_completed') return completeDuty(session, { dutyId: Number(args.dutyId), completed: true });
  if (name === 'duty_mark_uncompleted') return completeDuty(session, { dutyId: Number(args.dutyId), completed: false });

  if (name === 'bot_settings_read') {
    const me = await getMe(session);
    return {
      name: me.botName,
      memoryWindow: me.botMemoryWindow,
      settings: me.botSettings,
      otherContent: me.botOtherContent,
      toolPermissions: me.botToolPermissions,
    };
  }
  if (name === 'bot_settings_update_memory_window') {
    const me = await getMe(session);
    return updateDormBotSettings(session, me.botSettings, me.botOtherContent, Number(args.memoryWindow), Object.fromEntries((me.botToolPermissions || []).map((item) => [item.tool, item.permission as ToolPermission])));
  }
  if (name === 'bot_settings_update_name') return updateDormBotName(session, String(args.name || ''));
  if (name === 'bot_settings_add_field' || name === 'bot_settings_remove_field') {
    const me = await getMe(session);
    const key = String(args.key || '').trim();
    const rows = [...(me.botSettings || [])];
    if (name === 'bot_settings_add_field') {
      const value = String(args.value || '');
      const idx = rows.findIndex((item) => item.key === key);
      if (idx >= 0) rows[idx] = { key, value };
      else rows.push({ key, value });
    } else {
      const idx = rows.findIndex((item) => item.key === key);
      if (idx >= 0) rows.splice(idx, 1);
    }
    return updateDormBotSettings(session, rows, me.botOtherContent, me.botMemoryWindow, Object.fromEntries((me.botToolPermissions || []).map((item) => [item.tool, item.permission as ToolPermission])));
  }

  if (name === 'user_set_nickname') return updateMyName(session, { name: String(args.name || '') });
  if (name === 'user_set_language') return updateMyName(session, { language: String(args.language || 'zh-CN') as 'zh-CN' | 'zh-TW' | 'en' | 'fr' });
  if (name === 'user_set_description') return updateMemberDescriptions(session, [{ userId: Number(args.userId), description: String(args.description || '') }]);

  if (name === 'leader_transfer') return transferLeader(session, Number(args.targetUserId));
  if (name === 'leader_update_dorm_name') return updateDormName(session, String(args.name || ''));

  throw new ApiError(400, 'Unsupported tool');
}

export async function executeTool(name: string, rawArgs: unknown, context: ToolExecutionContext): Promise<ToolExecuteSuccess | ToolExecuteFailure> {
  const check = checkToolPermission(name, rawArgs, context);
  if (check) return check;

  const args = asRecord(rawArgs);
  if (!args) return denied('invalid_arguments', 'Arguments must be an object');

  try {
    const session = toSession(context);
    const output = await runTool(name, args, session);
    await notifyToolActionToOthers(name, args, session);
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed';
    return denied('tool_execution_failed', message);
  }
}

export async function listBotSettingsRaw(dormId: number): Promise<Array<{ key: string; value: string }>> {
  return listDormBotSettingsSafe(dormId);
}
