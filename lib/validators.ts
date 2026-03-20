import { z } from 'zod';
import { LIMITS } from '@/lib/limits';

export const loginInputSchema = z.object({
  email: z.string().trim().email({ message: '邮箱格式错误' }),
  name: z.string().trim().max(LIMITS.USER_NAME, { message: `昵称最多 ${LIMITS.USER_NAME} 字` }).optional(),
  mode: z.enum(['login', 'register']).optional().default('login'),
  inviteCode: z.string().trim().max(16).optional(),
});

export const updateNameSchema = z.object({
  name: z.string().trim().min(1, { message: '昵称不能为空' }).max(LIMITS.USER_NAME, { message: `昵称最多 ${LIMITS.USER_NAME} 字` }).optional(),
  language: z.enum(['zh-CN', 'zh-TW', 'fr', 'en']).optional(),
});

export const statusInputSchema = z.object({
  state: z.enum(['out', 'study', 'sleep', 'game']),
});

export const assignDutySchema = z.object({
  userId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: '日期格式必须为 YYYY-MM-DD' }),
  task: z.string().trim().min(1, { message: '任务内容不能为空' }).max(LIMITS.DUTY_TASK, { message: `任务内容最多 ${LIMITS.DUTY_TASK} 字` }),
});

export const completeDutySchema = z.object({
  dutyId: z.number().int().positive(),
  imageUrl: z.string().max(4096).optional().nullable(),
  completed: z.boolean().optional(),
});

const allowedBillCategories = ['electricity', 'water', 'internet', 'supplies', 'other'] as const;

export const createBillSchema = z
  .object({
    total: z
      .number()
      .finite({ message: '账单金额无效' })
      .gt(0, { message: '账单金额必须大于 0' })
      .max(1000000, { message: '账单金额不能超过 1000000' }),
    description: z.string().trim().max(LIMITS.BILL_DESCRIPTION, { message: `账单描述最多 ${LIMITS.BILL_DESCRIPTION} 字` }).optional().nullable(),
    category: z.string().trim().min(1, { message: '消费类型不能为空' }).max(20, { message: '消费类型过长' }).optional(),
    customCategory: z.string().trim().max(LIMITS.BILL_CUSTOM_CATEGORY, { message: `自定义类型最多 ${LIMITS.BILL_CUSTOM_CATEGORY} 字` }).optional().nullable(),
    participants: z
      .array(z.number().int().positive({ message: '参与人 ID 无效' }))
      .min(1, { message: '至少选择一位参与人' })
      .max(50, { message: '参与人数过多' }),
    participantWeights: z
      .array(
        z.object({
          userId: z.number().int().positive({ message: '参与人 ID 无效' }),
          weight: z
            .number()
            .finite({ message: '权重必须是数字' })
            .min(0, { message: '权重不能小于 0' })
            .max(LIMITS.BILL_WEIGHT, { message: `权重不能超过 ${LIMITS.BILL_WEIGHT}` }),
        }),
      )
      .optional(),
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

    if (value.participantWeights && value.participantWeights.length > 0) {
      const participantSet = new Set(value.participants);
      const weightUserSet = new Set<number>();
      for (const item of value.participantWeights) {
        if (!participantSet.has(item.userId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['participantWeights'],
            message: '权重用户必须在参与人列表中',
          });
        }
        if (weightUserSet.has(item.userId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['participantWeights'],
            message: '权重用户不能重复',
          });
        }
        weightUserSet.add(item.userId);
      }
    }

    const category = value.category?.trim() || 'other';
    if (!allowedBillCategories.includes(category as (typeof allowedBillCategories)[number])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: '消费类型不在允许范围内',
      });
    }

    if (category === 'other' && (!value.customCategory || value.customCategory.trim().length === 0)) {
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
  name: z.string().trim().min(1, { message: '宿舍名不能为空' }).max(LIMITS.DORM_NAME, { message: `宿舍名最多 ${LIMITS.DORM_NAME} 字` }),
});

export const transferLeaderSchema = z.object({
  targetUserId: z.number().int().positive(),
});

export const sendChatSchema = z.object({
  content: z.string().trim().min(1, { message: '消息不能为空' }).max(LIMITS.CHAT_USER_CONTENT, { message: `消息不能超过 ${LIMITS.CHAT_USER_CONTENT} 字` }),
  contextMessageIds: z.array(z.number().int().positive({ message: '上下文消息 ID 无效' })).max(200, { message: '上下文消息过多' }).optional(),
});
