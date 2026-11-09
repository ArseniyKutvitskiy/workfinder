export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
export function dbResult<T>(result: { data: T; error: unknown }) {
  if (result.error) throw new HttpError(503, "service.unavailable");
  return result.data;
}
