import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/errors';
import { prisma } from '@/lib/db';
import {
  assignDuty,
  completeDuty,
  createBill,
  getMe,
  listBills,
  listDuties,
  listStatus,
  loginOrRegister,
  markBillPaid,
  updateMyName,
  updateStatus,
} from '@/lib/services';
import type { SessionUser } from '@/lib/types';

function toSession(result: { userId: number; dormId: number; isLeader: boolean }): SessionUser {
  return {
    userId: result.userId,
    dormId: result.dormId,
    isLeader: result.isLeader,
  };
}

describe('backend services', () => {
  it('creates dorm and leader when invite code is empty', async () => {
    const result = await loginOrRegister('张三', 'zhangsan@campus.edu.cn');

    expect(result.isLeader).toBe(true);
    expect(result.inviteCode).toHaveLength(5);

    const dormCount = await prisma.dorm.count();
    const userCount = await prisma.user.count();
    expect(dormCount).toBe(1);
    expect(userCount).toBe(1);
  });

  it('joins existing dorm and reuses existing name as login', async () => {
    const leader = await loginOrRegister('舍长', 'leader@campus.edu.cn');
    const member = await loginOrRegister('室友', 'roommate@campus.edu.cn', leader.inviteCode);
    const memberAgain = await loginOrRegister('室友', 'roommate@campus.edu.cn', leader.inviteCode);

    expect(member.dormId).toBe(leader.dormId);
    expect(memberAgain.userId).toBe(member.userId);

    const users = await prisma.user.findMany({ where: { dormId: leader.dormId } });
    expect(users).toHaveLength(2);
  });

  it('enforces dorm isolation on status list', async () => {
    const dormA = await loginOrRegister('A舍长', 'aleader@campus.edu.cn');
    const aMember = await loginOrRegister('A成员', 'amember@campus.edu.cn', dormA.inviteCode);
    const dormB = await loginOrRegister('B舍长', 'bleader@campus.edu.cn');

    await updateStatus(toSession(aMember), 'study');
    await updateStatus(toSession(dormB), 'sleep');

    const statusA = await listStatus(toSession(dormA));

    expect(statusA.length).toBe(2);
    expect(statusA.map((item) => item.name)).toEqual(expect.arrayContaining(['A舍长', 'A成员']));
    expect(statusA.map((item) => item.name)).not.toContain('B舍长');
  });

  it('limits duty assignment to leader and completion to owner', async () => {
    const leader = await loginOrRegister('舍长', 'dutyleader@campus.edu.cn');
    const member = await loginOrRegister('成员', 'dutymember@campus.edu.cn', leader.inviteCode);

    await assignDuty(toSession(leader), {
      userId: member.userId,
      date: '2026-03-16',
      task: 'wipe desk',
    });

    await expect(
      assignDuty(toSession(member), {
        userId: member.userId,
        date: '2026-03-17',
        task: 'mop floor',
      }),
    ).rejects.toBeInstanceOf(ApiError);

    const duties = await listDuties(toSession(member), { week: '2026-03-16' });
    expect(duties.items).toHaveLength(1);
    expect(duties.items[0].userId).toBe(member.userId);
    expect(duties.items[0].task).toBe('wipe desk');

    const leaderToggle = await completeDuty(toSession(leader), {
      dutyId: duties.items[0].dutyId,
    });
    expect(leaderToggle.success).toBe(true);

    const completeResult = await completeDuty(toSession(member), {
      dutyId: duties.items[0].dutyId,
    });
    expect(completeResult.success).toBe(true);
  });

  it('creates bills and only allows user to mark self paid', async () => {
    const leader = await loginOrRegister('舍长', 'billleader@campus.edu.cn');
    const member = await loginOrRegister('成员', 'billmember@campus.edu.cn', leader.inviteCode);

    const created = await createBill(toSession(leader), {
      total: 120,
      description: '三月电费',
      participants: [leader.userId, member.userId],
      participantWeights: [
        { userId: leader.userId, weight: 1 },
        { userId: member.userId, weight: 3 },
      ],
    });

    expect(created.billId).toBeGreaterThan(0);

    const billList = await listBills(toSession(member));
    expect(billList.items).toHaveLength(1);
    expect(billList.items[0].totalCount).toBe(2);
    expect(billList.items[0].myAmount).toBeCloseTo(90, 2);

    const payResult = await markBillPaid(toSession(member), billList.items[0].id);
    expect(payResult.success).toBe(true);

    await expect(markBillPaid(toSession(leader), billList.items[0].id, member.userId)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('returns profile details and updates name with duplicate checks', async () => {
    const leader = await loginOrRegister('舍长', 'profileleader@campus.edu.cn');
    await loginOrRegister('成员', 'profilemember@campus.edu.cn', leader.inviteCode);

    const me = await getMe(toSession(leader));
    expect(me.members).toHaveLength(2);
    expect(me.inviteCode).toBeTruthy();

    const updated = await updateMyName(toSession(leader), { name: '新舍长' });
    expect(updated.name).toBe('新舍长');

    await expect(updateMyName(toSession(leader), { name: '成员' })).resolves.toBeTruthy();
  });
});


