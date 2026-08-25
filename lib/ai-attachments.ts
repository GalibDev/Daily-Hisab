export type AiAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string;
  text?: string;
};

export const AI_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const AI_ATTACHMENT_MAX_COUNT = 3;
export const AI_ATTACHMENT_ACCEPT = "image/*,.txt,.md,.csv,.json,.pdf";

export function validateAiAttachment(file: Pick<File, "name" | "size" | "type">) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const supported = file.type.startsWith("image/") || ["txt", "md", "csv", "json", "pdf"].includes(extension || "");
  if (!supported) return "এই file type support করা হয় না।";
  if (file.size > AI_ATTACHMENT_MAX_BYTES) return "প্রতি file সর্বোচ্চ 5 MB হতে পারবে।";
  return null;
}
