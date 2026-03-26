import type { ToolDescriptor } from './types';

export const BOT_TOOL_REGISTRY: ToolDescriptor[] = [
  {
    name: 'multiply',
    displayName: 'Multiplication',
    description: 'Calculate the product of two numbers.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
      additionalProperties: false,
    },
  },
  {
    name: 'bill_create',
    displayName: 'Create Bill',
    description: 'Create a new bill in current dorm.',
    operationScope: 'member',
    argumentSchema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Bill total amount' },
        category: { type: 'string', description: 'Bill category code' },
        customCategory: { type: 'string', description: 'Custom category text when category is other' },
        participants: { type: 'array', description: 'Participant userId list' },
      },
      required: ['total', 'participants'],
      additionalProperties: false,
    },
  },
  {
    name: 'bill_delete',
    displayName: 'Delete Bill',
    description: 'Delete a bill by bill id.',
    operationScope: 'member',
    argumentSchema: {
      type: 'object',
      properties: {
        billId: { type: 'number', description: 'Bill id' },
      },
      required: ['billId'],
      additionalProperties: false,
    },
  },
  {
    name: 'bill_list',
    displayName: 'List Bills',
    description: 'List bills visible to current user.',
    operationScope: 'read',
    argumentSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Page size' },
        cursor: { type: 'number', description: 'Pagination cursor' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'bill_mark_paid',
    displayName: 'Mark Bill Paid',
    description: 'Mark a bill as paid for a target user.',
    operationScope: 'self_or_leader',
    argumentSchema: {
      type: 'object',
      properties: {
        billId: { type: 'number', description: 'Bill id' },
        userId: { type: 'number', description: 'Target user id, optional' },
      },
      required: ['billId'],
      additionalProperties: false,
    },
  },
  {
    name: 'bill_mark_unpaid',
    displayName: 'Restore Bill Unpaid',
    description: 'Restore a paid bill to unpaid for target user.',
    operationScope: 'self_or_leader',
    argumentSchema: {
      type: 'object',
      properties: {
        billId: { type: 'number', description: 'Bill id' },
        userId: { type: 'number', description: 'Target user id, optional' },
      },
      required: ['billId'],
      additionalProperties: false,
    },
  },
  {
    name: 'duty_create',
    displayName: 'Create Duty Task',
    description: 'Create a duty task assignment.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'Assignee user id' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD' },
        task: { type: 'string', description: 'Task content' },
      },
      required: ['userId', 'date', 'task'],
      additionalProperties: false,
    },
  },
  {
    name: 'duty_delete',
    displayName: 'Delete Duty Task',
    description: 'Delete a duty task by id.',
    operationScope: 'member',
    argumentSchema: {
      type: 'object',
      properties: {
        dutyId: { type: 'number', description: 'Duty id' },
      },
      required: ['dutyId'],
      additionalProperties: false,
    },
  },
  {
    name: 'duty_list',
    displayName: 'List Duty Tasks',
    description: 'List duty tasks in current dorm.',
    operationScope: 'read',
    argumentSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', description: 'week or all' },
        limit: { type: 'number', description: 'Page size' },
        cursor: { type: 'number', description: 'Pagination cursor' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'duty_mark_completed',
    displayName: 'Mark Duty Completed',
    description: 'Mark duty as completed.',
    operationScope: 'self_or_leader',
    argumentSchema: {
      type: 'object',
      properties: {
        dutyId: { type: 'number', description: 'Duty id' },
      },
      required: ['dutyId'],
      additionalProperties: false,
    },
  },
  {
    name: 'duty_mark_uncompleted',
    displayName: 'Restore Duty Uncompleted',
    description: 'Restore duty to uncompleted.',
    operationScope: 'self_or_leader',
    argumentSchema: {
      type: 'object',
      properties: {
        dutyId: { type: 'number', description: 'Duty id' },
      },
      required: ['dutyId'],
      additionalProperties: false,
    },
  },
  {
    name: 'bot_settings_read',
    displayName: 'Read Bot Settings',
    description: 'Read dorm bot settings.',
    operationScope: 'read',
    argumentSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: 'bot_settings_update_memory_window',
    displayName: 'Update Bot Memory Window',
    description: 'Update bot memory window length.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        memoryWindow: { type: 'number', description: 'Memory window length' },
      },
      required: ['memoryWindow'],
      additionalProperties: false,
    },
  },
  {
    name: 'bot_settings_update_name',
    displayName: 'Update Bot Name',
    description: 'Update bot display name.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'New bot name' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'bot_settings_add_field',
    displayName: 'Add Bot Setting Field',
    description: 'Add one key-value field in bot settings.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key' },
        value: { type: 'string', description: 'Setting value' },
      },
      required: ['key', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'bot_settings_remove_field',
    displayName: 'Remove Bot Setting Field',
    description: 'Remove one key from bot settings.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Setting key to remove' },
      },
      required: ['key'],
      additionalProperties: false,
    },
  },
  {
    name: 'user_set_nickname',
    displayName: 'Set User Nickname',
    description: 'Set nickname for current user.',
    operationScope: 'member',
    argumentSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nickname' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'user_set_language',
    displayName: 'Set User Language',
    description: 'Set language for current user.',
    operationScope: 'member',
    argumentSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language code', enum: ['zh-CN', 'zh-TW', 'en', 'fr'] },
      },
      required: ['language'],
      additionalProperties: false,
    },
  },
  {
    name: 'user_set_description',
    displayName: 'Set User Description',
    description: 'Set description for self or by leader for any member.',
    operationScope: 'self_or_leader',
    argumentSchema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: 'Target user id' },
        description: { type: 'string', description: 'Description text' },
      },
      required: ['userId', 'description'],
      additionalProperties: false,
    },
  },
  {
    name: 'leader_transfer',
    displayName: 'Transfer Leader',
    description: 'Transfer leader role to target member.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'number', description: 'Target user id' },
      },
      required: ['targetUserId'],
      additionalProperties: false,
    },
  },
  {
    name: 'leader_update_dorm_name',
    displayName: 'Update Dorm Name',
    description: 'Update dorm name.',
    operationScope: 'leader',
    argumentSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Dorm name' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
];

export const TOOL_DESCRIPTOR_MAP = new Map(BOT_TOOL_REGISTRY.map((item) => [item.name, item] as const));
