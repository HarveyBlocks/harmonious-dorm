import { describe, expect, it } from 'vitest';

import { loginOrRegister } from '@/lib/services';
import { executeTool, listDormToolRows, setDormToolPermissions } from '@/lib/tools';

function ctx(input: { userId: number; dormId: number; isLeader: boolean }) {
  return {
    callerUserId: input.userId,
    callerIsLeader: input.isLeader,
    dormId: input.dormId,
  };
}

describe('tool functions', () => {
  it('syncs tool catalog and permission rows', async () => {
    const leader = await loginOrRegister('Leader', 'tool-leader@campus.edu');
    const rows = await listDormToolRows(leader.dormId);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.some((item) => item.name === 'bill_create')).toBe(true);
  });

  it('runs bill and duty tools with service-level checks', async () => {
    const leader = await loginOrRegister('Leader', 'tool3-leader@campus.edu');
    const member = await loginOrRegister('Member', 'tool3-member@campus.edu', leader.inviteCode);

    await setDormToolPermissions(leader.dormId, {
      bill_create: 'allow',
      bill_list: 'allow',
      bill_mark_paid: 'allow',
      bill_mark_unpaid: 'allow',
      duty_create: 'allow',
      duty_list: 'allow',
      duty_mark_completed: 'allow',
      duty_mark_uncompleted: 'allow',
    });

    const createBill = await executeTool('bill_create', {
      total: 88,
      participants: [leader.userId, member.userId],
      category: 'electricity',
    }, ctx(member));
    expect(createBill.ok).toBe(true);

    const listBill = await executeTool('bill_list', { limit: 10 }, ctx(member));
    expect(listBill.ok).toBe(true);

    const billId = listBill.ok ? Number((listBill.output as { items: Array<{ id: number }> }).items[0]?.id) : 0;
    expect(billId).toBeGreaterThan(0);

    const markPaid = await executeTool('bill_mark_paid', { billId }, ctx(member));
    expect(markPaid.ok).toBe(true);

    const markUnpaid = await executeTool('bill_mark_unpaid', { billId }, ctx(member));
    expect(markUnpaid.ok).toBe(true);

    const dutyDenied = await executeTool('duty_create', { userId: member.userId, date: '2026-03-20', task: 'clean floor' }, ctx(member));
    expect(dutyDenied.ok).toBe(false);

    const dutyCreated = await executeTool('duty_create', { userId: member.userId, date: '2026-03-20', task: 'clean floor' }, ctx(leader));
    expect(dutyCreated.ok).toBe(true);

    const dutyList = await executeTool('duty_list', { scope: 'all', limit: 10 }, ctx(member));
    expect(dutyList.ok).toBe(true);
    const dutyId = dutyList.ok ? Number((dutyList.output as { items: Array<{ dutyId: number }> }).items[0]?.dutyId) : 0;
    expect(dutyId).toBeGreaterThan(0);

    const done = await executeTool('duty_mark_completed', { dutyId }, ctx(member));
    expect(done.ok).toBe(true);
    const undone = await executeTool('duty_mark_uncompleted', { dutyId }, ctx(member));
    expect(undone.ok).toBe(true);
  });

  it('runs settings tools and leader-only tools', async () => {
    const leader = await loginOrRegister('Leader', 'tool4-leader@campus.edu');
    const member = await loginOrRegister('Member', 'tool4-member@campus.edu', leader.inviteCode);

    await setDormToolPermissions(leader.dormId, {
      bot_settings_read: 'allow',
      bot_settings_update_name: 'allow',
      bot_settings_update_memory_window: 'allow',
      user_set_nickname: 'allow',
      user_set_language: 'allow',
      user_set_description: 'allow',
      leader_transfer: 'allow',
      leader_update_dorm_name: 'allow',
    });

    const read = await executeTool('bot_settings_read', {}, ctx(member));
    expect(read.ok).toBe(true);

    const updateNameDenied = await executeTool('bot_settings_update_name', { name: 'Dorm Bot X' }, ctx(member));
    expect(updateNameDenied.ok).toBe(false);

    const updateName = await executeTool('bot_settings_update_name', { name: 'Dorm Bot X' }, ctx(leader));
    expect(updateName.ok).toBe(true);

    const setLang = await executeTool('user_set_language', { language: 'en' }, ctx(member));
    expect(setLang.ok).toBe(true);

    const setDescSelf = await executeTool('user_set_description', { userId: member.userId, description: 'hello' }, ctx(member));
    expect(setDescSelf.ok).toBe(true);

    const setDescByLeader = await executeTool('user_set_description', { userId: member.userId, description: 'updated by leader' }, ctx(leader));
    expect(setDescByLeader.ok).toBe(true);

    const setDormDenied = await executeTool('leader_update_dorm_name', { name: 'New Dorm' }, ctx(member));
    expect(setDormDenied.ok).toBe(false);

    const setDorm = await executeTool('leader_update_dorm_name', { name: 'New Dorm' }, ctx(leader));
    expect(setDorm.ok).toBe(true);
  });
});


