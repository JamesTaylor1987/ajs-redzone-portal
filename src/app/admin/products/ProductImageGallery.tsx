"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  createSignedUploadUrlAction,
  registerProductImageAction,
  deleteProductImageAction,
  moveProductImageAction,
} from "./actions";
import { getBrowserClient } from "@/lib/supabase-browser";

interface ProductImage {
  id: string;
  url: string;
  sort_order: number;
}

interface UploadItem {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface Props {
  productId: string;
  images: ProductImage[];
}

export function ProductImageGallery({ productId, images }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [moving, startMove] = useTransition();
  const [deleting, startDelete] = useTransition();

  function updateUpload(id: string, patch: Partial<UploadItem>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function uploadFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const items: UploadItem[] = imageFiles.map((f) => ({
      id: `${f.name}-${Math.random()}`,
      name: f.name,
      status: "uploading",
    }));
    setUploads((prev) => [...prev, ...items]);

    const supabase = getBrowserClient();

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const uid = items[i].id;

      try {
        const urlRes = await createSignedUploadUrlAction(productId, file.name);
        if (urlRes.error || !urlRes.path || !urlRes.token) {
          updateUpload(uid, { status: "error", error: urlRes.error ?? "Failed to get upload URL" });
          continue;
        }

        // Upload direct to Supabase — bypasses Vercel body limit entirely
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .uploadToSignedUrl(urlRes.path, urlRes.token, file, { contentType: file.type });

        if (uploadError) {
          updateUpload(uid, { status: "error", error: uploadError.message });
          continue;
        }

        const regRes = await registerProductImageAction(productId, urlRes.path);
        if (regRes.error) {
          updateUpload(uid, { status: "error", error: regRes.error });
          continue;
        }

        updateUpload(uid, { status: "done" });
      } catch {
        updateUpload(uid, { status: "error", error: "Upload failed" });
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setDragOver(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDragLeave() {
    dragCounter.current--;
    if (dragCounter.current === 0) setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  }

  function handleMove(img: ProductImage, direction: "left" | "right") {
    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("imageId", img.id);
    fd.append("direction", direction);
    startMove(async () => {
      const res = await moveProductImageAction(fd);
      if (res?.error) alert(res.error);
    });
  }

  function handleDelete(img: ProductImage) {
    if (!confirm("Delete this image?")) return;
    const fd = new FormData();
    fd.append("imageId", img.id);
    fd.append("productId", productId);
    fd.append("url", img.url);
    startDelete(async () => {
      const res = await deleteProductImageAction(fd);
      if (res?.error) alert(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark">
        Product photos
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-ajs-light bg-slate-50"
            >
              <Image
                src={img.url}
                alt={`Product photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-ajs-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => handleDelete(img)}
                disabled={deleting}
                className="absolute top-1 right-1 w-6 h-6 bg-rose-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Delete photo"
              >
                ×
              </button>
              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMove(img, "left")}
                    disabled={moving}
                    className="w-6 h-6 bg-black/60 text-white rounded text-xs flex items-center justify-center"
                    aria-label="Move left"
                  >
                    ←
                  </button>
                )}
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMove(img, "right")}
                    disabled={moving}
                    className="w-6 h-6 bg-black/60 text-white rounded text-xs flex items-center justify-center"
                    aria-label="Move right"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors select-none ${
          dragOver
            ? "border-ajs-primary bg-ajs-primary/5"
            : "border-ajs-light hover:border-ajs-primary/50 hover:bg-slate-50"
        }`}
      >
        <p className="text-sm text-ajs-muted pointer-events-none">
          {dragOver ? (
            <span className="font-semibold text-ajs-primary">Drop to upload</span>
          ) : (
            <>Drag photos here or <span className="font-semibold text-ajs-primary">browse files</span></>
          )}
        </p>
        <p className="text-xs text-ajs-light mt-1 pointer-events-none">
          Multiple files supported — any size
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Per-file upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-1.5">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  u.status === "uploading"
                    ? "bg-amber-400 animate-pulse"
                    : u.status === "done"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-ajs-muted truncate flex-1 max-w-[200px]">{u.name}</span>
              <span
                className={
                  u.status === "uploading"
                    ? "text-amber-600"
                    : u.status === "done"
                    ? "text-emerald-600 font-semibold"
                    : "text-rose-600"
                }
              >
                {u.status === "uploading"
                  ? "Uploading…"
                  : u.status === "done"
                  ? "Saved"
                  : (u.error ?? "Error")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
