export interface DiscordErrorBody {
  code: number;
  message: string;
  errors?: Record<string, unknown>;
}

export class DiscordApiError extends Error {
  public readonly statusCode: number;
  public readonly code: number;
  public readonly errors?: Record<string, unknown>;

  public constructor(
    statusCode: number,
    code: number,
    message: string,
    errors?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DiscordApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }

  public toJSON(): DiscordErrorBody {
    if (this.errors) {
      return {
        code: this.code,
        message: this.message,
        errors: this.errors,
      };
    }

    return {
      code: this.code,
      message: this.message,
    };
  }
}
