import { runMultiplyTool, type MultiplyToolArgs } from './multiply-tool';

export type ToolPermission = 'allow' | 'deny';
export type ToolName = 'multiply';
export type ToolAccessPolicy = 'leader_only';

export interface ToolDescriptor {
  name: ToolName;
  description: string;
  accessPolicy: ToolAccessPolicy;
  argumentSchema: {
    type: 'object';
    properties: Record<string, { type: 'number'; description: string }>;
    required: string[];
    additionalProperties: boolean;
  };
}

export type ToolExecutionContext = {
  callerUserId: number;
  callerIsLeader: boolean;
};

type ToolExecuteSuccess = { ok: true; output: { result: number } };
type ToolExecuteFailure = { ok: false; error: string; errorCode: 'permission_required_leader' | 'invalid_arguments' | 'unsupported_tool' };

export const BOT_TOOL_REGISTRY: ToolDescriptor[] = [
  {
    name: 'multiply',
    description: 'Multiply two numbers.',
    accessPolicy: 'leader_only',
    argumentSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First multiplicand' },
        b: { type: 'number', description: 'Second multiplicand' },
      },
      required: ['a', 'b'],
      additionalProperties: false,
    },
  },
];

export function listToolNames(): ToolName[] {
  return BOT_TOOL_REGISTRY.map((item) => item.name);
}

export function listAllowedTools(permissionMap: Record<string, ToolPermission>): ToolDescriptor[] {
  return BOT_TOOL_REGISTRY.filter((item) => (permissionMap[item.name] || 'deny') === 'allow');
}

function checkToolAccess(name: ToolName, context: ToolExecutionContext): ToolExecuteFailure | null {
  if (name === 'multiply' && !context.callerIsLeader) {
    return {
      ok: false,
      errorCode: 'permission_required_leader',
      error: 'Tool execution denied: leader approval required.',
    };
  }
  return null;
}

export function executeTool(name: ToolName, rawArgs: unknown, context: ToolExecutionContext): ToolExecuteSuccess | ToolExecuteFailure {
  if (name !== 'multiply') {
    return { ok: false, errorCode: 'unsupported_tool', error: 'Unsupported tool' };
  }

  const denied = checkToolAccess(name, context);
  if (denied) return denied;

  if (!rawArgs || typeof rawArgs !== 'object') {
    return { ok: false, errorCode: 'invalid_arguments', error: 'Arguments must be an object' };
  }

  const record = rawArgs as Record<string, unknown>;
  const a = Number(record.a);
  const b = Number(record.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { ok: false, errorCode: 'invalid_arguments', error: 'Arguments a and b must be numbers' };
  }

  return { ok: true, output: runMultiplyTool({ a, b } as MultiplyToolArgs) };
}
