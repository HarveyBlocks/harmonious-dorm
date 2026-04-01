export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly controlled: boolean;
  readonly report?: Record<string, unknown>;

  constructor(status: number, message: string, options: { code: string; controlled?: boolean; report?: Record<string, unknown> }) {
    super(message);
    this.status = status;
    this.code = options.code;
    this.controlled = options?.controlled ?? true;
    this.report = options?.report;
  }
}

export class BackendErrorCodeMissingError extends Error {
  readonly missingCode: string;

  constructor(code: string) {
    super(`Backend error i18n code not found: ${code}`);
    this.name = 'BackendErrorCodeMissingError';
    this.missingCode = code;
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
    code: string;
    upstreamService: string;
    upstreamStatus?: number;
    upstreamCode?: string;
    retryable?: boolean;
    report?: Record<string, unknown>;
  }) {
    super(input.status ?? 502, input.message, {
      code: input.code,
      controlled: true,
      report: input.report,
    });
    this.upstreamService = input.upstreamService;
    this.upstreamStatus = input.upstreamStatus;
    this.upstreamCode = input.upstreamCode;
    this.retryable = input.retryable ?? false;
  }
}

export class StreamAbortError extends ApiError {
  constructor(message = 'Stream aborted') {
    super(499, message, { code: 'stream.aborted', controlled: true });
  }
}

export function isControlledError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.controlled;
}
