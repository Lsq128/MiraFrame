/**
 * API Error class — structured error representation for all API calls.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
    public readonly requestInfo?: { method: string; url: string },
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Returns a toast-friendly representation suitable for UI notification systems.
   */
  toast(): { message: string; description?: string } {
    const description =
      this.status != null
        ? `[${this.code}] HTTP ${this.status}`
        : `[${this.code}]`;

    return {
      message: this.message,
      description: this.details
        ? `${description}: ${String(this.details)}`
        : description,
    };
  }

  /**
   * Full string representation including request info when available.
   */
  toString(): string {
    const parts: string[] = [`ApiError [${this.code}]: ${this.message}`];
    if (this.status != null) {
      parts.push(`(HTTP ${this.status})`);
    }
    if (this.requestInfo) {
      parts.push(
        `\n  Request: ${this.requestInfo.method} ${this.requestInfo.url}`,
      );
    }
    if (this.details != null) {
      parts.push(`\n  Details: ${JSON.stringify(this.details)}`);
    }
    if (this.responseBody != null) {
      const truncated =
        this.responseBody.length > 500
          ? this.responseBody.slice(0, 500) + "..."
          : this.responseBody;
      parts.push(`\n  Response: ${truncated}`);
    }
    return parts.join("");
  }
}
