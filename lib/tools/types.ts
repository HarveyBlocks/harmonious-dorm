export type ToolPermission = 'allow' | 'deny';
export type ToolOperationScope = 'read' | 'member' | 'self_or_leader' | 'leader';

export interface ToolDescriptor {
  name: string;
  displayName: string;
  description: string;
  operationScope: ToolOperationScope;
  argumentSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
    additionalProperties: boolean;
  };
}

export type ToolExecutionContext = {
  callerUserId: number;
  callerIsLeader: boolean;
  dormId: number;
};

export type ToolExecuteSuccess = { ok: true; output: unknown };
export type ToolExecuteFailure = {
  ok: false;
  error: string;
  errorCode: 'permission_required_leader' | 'permission_required_self_or_leader' | 'invalid_arguments' | 'unsupported_tool' | 'tool_execution_failed';
};
