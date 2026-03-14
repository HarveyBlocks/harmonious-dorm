import { z } from 'zod';

export const loginInputSchema = z.object({
  email: z.string().trim().email('邮箱格式错误'),
  name: z.string().trim().max(20, '昵称最多 20 字').optional(),
  mode: z.enum(['login', 'register']).optional().default('login'),
  inviteCode: z.string().trim().max(16).optional(),
});

export const updateNameSchema = z.object({
  name: z.string().trim().min(1, '昵称不能为空').max(20, '昵称最多 20 字').optional(),
  language: z.enum(['zh-CN', 'zh-TW', 'fr', 'en']).optional(),
});

export const statusInputSchema = z.object({
  state: z.enum(['学习', '睡觉', '游戏', '外出']),
});

export const assignDutySchema = z.object({
  userId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
});

export const completeDutySchema = z.object({
  dutyId: z.number().int().positive(),
  imageUrl: z.string().max(4096).optional().nullable(),
  completed: z.boolean().optional(),
});

const allowedBillCategories = ['电费', '水费', '网费', '日用品', '其他'] as const;

export const createBillSchema = z
  .object({
    total: z
      .number()
      .finite('账单金额无效')
      .gt(0, '账单金额必须大于 0')
      .max(1000000, '账单金额不能超过 1000000'),
    description: z.string().trim().max(120, '账单描述最多 120 字').optional().nullable(),
    category: z.string().trim().min(1, '消费类型不能为空').max(20, '消费类型过长').optional(),
    customCategory: z.string().trim().max(30, '自定义类型最多 30 字').optional().nullable(),
    participants: z
      .array(z.number().int().positive('参与人 ID 无效'))
      .min(1, '至少选择一位参与人')
      .max(50, '参与人数过多'),
  })
  .superRefine((value, ctx) => {
    if (!Number.isInteger(value.total * 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['total'],
        message: '账单金额最多保留两位小数',
      });
    }

    const unique = new Set(value.participants);
    if (unique.size !== value.participants.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participants'],
        message: '参与人不能重复选择',
      });
    }

    const category = value.category?.trim() || '其他';
    if (!allowedBillCategories.includes(category as (typeof allowedBillCategories)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: '消费类型不在允许范围内',
      });
    }

    if (category === '其他' && value.customCategory && value.customCategory.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customCategory'],
        message: '自定义类型不能为空',
      });
    }
  });

export const markPaySchema = z.object({
  userId: z.number().int().positive().optional(),
  paid: z.boolean().optional(),
});

export const updateDormSchema = z.object({
  name: z.string().trim().min(1, '宿舍名不能为空').max(30),
});

export const transferLeaderSchema = z.object({
  targetUserId: z.number().int().positive(),
});

export const sendChatSchema = z.object({
  content: z.string().trim().min(1, '消息不能为空').max(500),
});
