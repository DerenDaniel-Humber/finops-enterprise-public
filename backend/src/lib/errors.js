export class AppError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export const bad = (message, fields) =>
  new AppError(400, "VALIDATION_ERROR", message, fields);
export const missing = (name) =>
  new AppError(404, "NOT_FOUND", `${name} not found.`);
export const conflict = (message) => new AppError(409, "CONFLICT", message);
