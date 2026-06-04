"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import { addProductImageAction, deleteProductImageAction, moveProductImageAction } from "./actions";

interface ProductImage {
  id: string;
  url: string;
  sort_order: number;
}

interface ProductImageGalleryProps {
  productId: string;
  images: ProductImage[];
}

export function ProductImageGallery({ productId, images }: ProductImageGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [moving, startMove] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("productId", productId);
    fd.append("image", file);
    startUpload(async () => {
      const res = await addProductImageAction(fd);
      if (res?.error) alert(res.error);
      if (fileRef.current) fileRef.current.value = "";
    });
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
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wide text-ajs-dark">
          Product photos
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold text-ajs-primary hover:text-ajs-dark disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Add photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {images.length === 0 && (
        <div className="border-2 border-dashed border-ajs-light rounded-lg p-6 text-center text-ajs-muted text-sm">
          No photos yet. Click &quot;+ Add photo&quot; to upload one.
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-ajs-light bg-slate-50">
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
            {/* Delete */}
            <button
              type="button"
              onClick={() => handleDelete(img)}
              disabled={deleting}
              className="absolute top-1 right-1 w-6 h-6 bg-rose-600 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              aria-label="Delete photo"
            >
              ×
            </button>
            {/* Move left/right */}
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
    </div>
  );
}
