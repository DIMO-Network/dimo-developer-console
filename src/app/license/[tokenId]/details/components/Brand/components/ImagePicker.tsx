'use client';
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  label: string;
  hint: string;
  /** HTTPS URL of the currently stored image (resolved CID). */
  currentUrl: string | null;
  /** The file the user just picked but hasn't saved yet. */
  file: File | null;
  onFile: (file: File | null) => void;
  /** Clear both the picked file and the saved image. */
  onClear: () => void;
  /** 'square' applies a 1:1 crop step; 'wide' uses the file as-is. */
  aspect: 'wide' | 'square';
  disabled?: boolean;
}

/**
 * Picker for one brand image. Renders the current image preview (if any),
 * a hidden file input with drag-and-drop affordance, and — when `aspect`
 * is 'square' and the user has picked a non-SVG — a react-easy-crop
 * overlay that produces a 1:1 cropped file ready for upload.
 */
export const ImagePicker: FC<Props> = ({
  label,
  hint,
  currentUrl,
  file,
  onFile,
  onClear,
  aspect,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview URL for the picked-but-unsaved file
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handlePick = (picked: File | null) => {
    setError(null);
    if (!picked) return;
    if (!ALLOWED_TYPES.includes(picked.type)) {
      setError(`Unsupported file type ${picked.type}. Use PNG, JPEG, WebP, or SVG.`);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(`File too large (${Math.round(picked.size / 1024)} KB). Max 2 MB.`);
      return;
    }
    onFile(picked);
  };

  return (
    <div className="field">
      <Label className="text-sm font-medium">
        {label}
        <p className="text-text-secondary font-normal">{hint}</p>
      </Label>

      <div className="flex flex-row gap-4 items-start mt-2">
        {(previewUrl ?? currentUrl) && (
          <div className="flex flex-col gap-1">
            <PreviewBox
              src={previewUrl ?? currentUrl!}
              aspect={aspect}
              file={file}
              onCropped={onFile}
            />
            {!disabled && (currentUrl || previewUrl) && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  if (inputRef.current) inputRef.current.value = '';
                }}
                className="text-xs text-text-secondary hover:text-text-primary underline"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {!disabled && (
          <DropZone
            disabled={disabled}
            onFiles={(files) => handlePick(files[0] ?? null)}
            onClick={() => inputRef.current?.click()}
            hasExisting={!!(previewUrl ?? currentUrl)}
          />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
          disabled={disabled}
        />
      </div>

      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
};

/* ────────── DropZone ────────── */

const DropZone: FC<{
  disabled?: boolean;
  hasExisting: boolean;
  onFiles: (files: File[]) => void;
  onClick: () => void;
}> = ({ disabled, hasExisting, onFiles, onClick }) => {
  const [dragOver, setDragOver] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
      className={`flex-1 min-h-[80px] border border-dashed rounded-xl px-4 py-3 text-sm transition-colors
        ${dragOver ? 'border-text-primary bg-surface-raised' : 'border-border'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-text-primary cursor-pointer'}`}
    >
      <span className="text-text-primary font-medium">
        {hasExisting ? 'Replace image' : 'Choose image'}
      </span>
      <span className="text-text-secondary ml-2">or drop here</span>
    </button>
  );
};

/* ────────── PreviewBox — wide passthrough, square w/ cropper ────────── */

const PreviewBox: FC<{
  src: string;
  aspect: 'wide' | 'square';
  file: File | null;
  /** Called with a cropped File when the user confirms the square crop. */
  onCropped: (file: File) => void;
}> = ({ src, aspect, file, onCropped }) => {
  // Square crop only kicks in when the user has just picked a non-SVG file.
  // SVGs are already vector — crop them with a CSS object-fit on the consumer
  // side instead of rasterising.
  const needsCrop = aspect === 'square' && file && file.type !== 'image/svg+xml';

  if (!needsCrop) {
    return (
      <div
        className={`bg-surface-raised border border-border rounded-lg overflow-hidden
          ${aspect === 'square' ? 'w-24 h-24' : 'w-32 h-16'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="brand preview" className="w-full h-full object-contain" />
      </div>
    );
  }

  return <SquareCropper src={src} file={file!} onCropped={onCropped} />;
};

/* ────────── SquareCropper ────────── */

const SquareCropper: FC<{
  src: string;
  file: File;
  onCropped: (cropped: File) => void;
}> = ({ src, file, onCropped }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [pending, setPending] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixels(areaPixels);
  }, []);

  const confirm = async () => {
    if (!pixels) return;
    setPending(true);
    try {
      const cropped = await cropToFile(src, pixels, file.name, file.type);
      onCropped(cropped);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-72">
      <div className="relative w-72 h-72 bg-surface-raised rounded-lg overflow-hidden">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="flex flex-row gap-2 items-center">
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
        />
        <Button
          type="button"
          className="light"
          onClick={confirm}
          disabled={!pixels}
          loading={pending}
        >
          Crop
        </Button>
      </div>
    </div>
  );
};

/**
 * Rasterise a cropped region of an image onto a canvas and return a File.
 * Preserves original content-type. Used for the square icon crop.
 */
async function cropToFile(
  src: string,
  pixels: Area,
  name: string,
  mime: string,
): Promise<File> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(
    img,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    pixels.width,
    pixels.height,
  );
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
      mime,
      0.92,
    ),
  );
  return new File([blob], name, { type: mime });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
