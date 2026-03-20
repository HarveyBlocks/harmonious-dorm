export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly controlled: boolean;
  readonly report?: Record<string, unknown>;

  constructor(status: number, message: string, options?: { code?: string; controlled?: boolean; report?: Record<string, unknown> }) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.controlled = options?.controlled ?? true;
    this.report = options?.report;
  }
}

export class UpstreamServiceError extends ApiError {
  readonly upstreamService: string;
  readonly upstreamStatus?: number;
  readonly upstreamCode?: string;
  readonly retryable: boolean;

  constructor(input: {
    status?: number;
    message: string;
    upstreamService: string;
    upstreamStatus?: number;
    upstreamCode?: string;
    retryable?: boolean;
    report?: Record<string, unknown>;
  }) {
    super(input.status ?? 502, input.message, {
      code: 'UPSTREAM_ERROR',
      controlled: true,
      report: input.report,
    });
    this.upstreamService = input.upstreamService;
    this.upstreamStatus = input.upstreamStatus;
    this.upstreamCode = input.upstreamCode;
    this.retryable = input.retryable ?? false;
  }
}

export function isControlledError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.controlled;
}
