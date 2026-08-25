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

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsText(file);
  });
}

export async function createAiAttachment(file: File): Promise<AiAttachment> {
  const validationError = validateAiAttachment(file);
  if (validationError) throw new Error(validationError);
  const isText = /\.(txt|md|csv|json)$/i.test(file.name);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain"),
    size: file.size,
    dataUrl: isText ? undefined : await readAsDataUrl(file),
    text: isText ? (await readAsText(file)).slice(0, 20000) : undefined,
  };
}
