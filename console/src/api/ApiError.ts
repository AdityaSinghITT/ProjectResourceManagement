export interface ApiErrorBody {
  error: string;
  message: string;
  statusCode: number;
}

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly errorTitle: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromBody(body: ApiErrorBody): ApiError {
    return new ApiError(body.statusCode, body.error, body.message);
  }
}
