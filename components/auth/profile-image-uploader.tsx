"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ProfileImageUploader() {
  const { uploadProfileImage, user } = useAuth();
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const uploadFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        notify("Only image files are allowed", "danger");
        return;
      }

      try {
        setUploading(true);
        await uploadProfileImage(file);
        notify("Profile image updated", "success");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Image upload failed", "danger");
      } finally {
        setUploading(false);
        setDragging(false);
      }
    },
    [notify, uploadProfileImage],
  );

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void uploadFile(event.dataTransfer.files[0]);
  }

  function handlePaste(event: ClipboardEvent<HTMLLabelElement>) {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
    if (image) {
      void uploadFile(image);
    }
  }

  return (
    <label
      tabIndex={0}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={dragging ? "grid cursor-pointer gap-3 rounded-xl border border-dashed border-[#6C4CF1] bg-[#f4f1ff] p-4 text-center" : "grid cursor-pointer gap-3 rounded-xl border border-dashed border-[#d8d1ff] bg-[#fbfaff] p-4 text-center"}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadFile(event.target.files?.[0])} />
      <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-full bg-[#efeaff] text-[#6C4CF1]">
        {user?.photoUrl ? <Image src={user.photoUrl} alt="Profile" width={80} height={80} className="size-full object-cover" /> : <Upload />}
      </div>
      <div>
        <p className="text-sm font-bold">Profile image upload</p>
        <p className="text-xs text-[#746d86]">Click, drag-drop, or paste image here</p>
      </div>
      <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? "Uploading..." : "Choose Image"}</Button>
    </label>
  );
}
