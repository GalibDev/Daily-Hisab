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
