"use client";

import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "jpg", "jpeg", "png", "eml", "msg"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

interface DropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  onFileRejected: (file: File, reason: string) => void;
}

export function Dropzone({ onFilesAccepted, onFileRejected }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSplit(fileList: FileList | File[]) {
    const accepted: File[] = [];

    for (const file of Array.from(fileList)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        onFileRejected(file, `".${extension}" isn't a supported file type.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        onFileRejected(file, "File is larger than the 20 MB limit.");
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > 0) onFilesAccepted(accepted);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) validateAndSplit(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary-soft"
          : "border-border bg-card hover:border-border-strong hover:bg-muted/40"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
        onChange={(e) => {
          if (e.target.files?.length) validateAndSplit(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
          isDragging ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
        )}
      >
        <UploadCloud className="h-6 w-6" />
      </div>

      <p className="mt-4 text-sm font-semibold text-foreground">
        {isDragging ? "Drop to upload" : "Drag & drop files here"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        or <span className="font-medium text-primary">browse from your computer</span>
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Supports PDF, DOCX, TXT, JPG, PNG, EML, MSG — up to 20 MB each
      </p>
    </div>
  );
}
