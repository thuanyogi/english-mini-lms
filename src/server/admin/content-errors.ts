import type { FieldError } from "@/lib/content-constants";

/** Lỗi nghiệp vụ của quản lý nội dung; route chuyển thành JSON { error, details }. */
export class ContentError extends Error {
  status: number;
  details: FieldError[];
  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message);
    this.name = "ContentError";
    this.status = status;
    this.details = details;
  }
}
