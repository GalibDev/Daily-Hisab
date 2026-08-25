"use client";

import { FileText, Image as ImageIcon, X } from "lucide-react";
import { formatAttachmentSize, type AiAttachment } from "@/lib/ai-attachments";

export function AiAttachmentList({ attachments, onRemove }: Readonly<{ attachments: AiAttachment[]; onRemove?: (id: string) => void }>) {
  if (!attachments.length) return null;
  return <div className="flex gap-2 overflow-x-auto pb-1">{attachments.map((attachment) => <div key={attachment.id} className="relative flex min-w-0 max-w-[190px] items-center gap-2 rounded-xl border border-[#dfe5f2] bg-white p-2 shadow-sm">{attachment.mimeType.startsWith("image/") && attachment.dataUrl ? <img src={attachment.dataUrl} alt="" className="size-9 shrink-0 rounded-lg object-cover" /> : <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#eef3ff] text-[#3152b8]">{attachment.mimeType.startsWith("image/") ? <ImageIcon size={17} /> : <FileText size={17} />}</span>}<span className="min-w-0"><strong className="block truncate text-[10px] text-[#20263a]">{attachment.name}</strong><small className="text-[9px] font-semibold text-[#7a8298]">{formatAttachmentSize(attachment.size)}</small></span>{onRemove && <button type="button" onClick={() => onRemove(attachment.id)} aria-label={`Remove ${attachment.name}`} className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f1f3f8] text-[#59627a]"><X size={12} /></button>}</div>)}</div>;
}
