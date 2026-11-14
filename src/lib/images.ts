export interface ImageOptions {
  maxWidth: number;
  maxHeight: number;
  maxBytes: number;
  quality?: number;
  preserveAnimation?: boolean;
}

function dataUrlBytes(value: string): number {
  const comma = value.indexOf(",");
  if (comma < 0) return value.length;
  const payload = value.slice(comma + 1);
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать изображение"));
    reader.readAsDataURL(file);
  });
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // WebKit versions without createImageBitmap support fall through to Image.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Не удалось открыть изображение"));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Read an image file and downscale it into a compact data URL. This is the
 * single entry point for every user-provided image so the persisted state
 * never grows to tens of megabytes.
 */
export async function fileToDataUrl(file: File, options: ImageOptions): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name)) {
    throw new Error("Выберите файл изображения");
  }

  const quality = options.quality ?? 0.84;
  const maxBytes = options.maxBytes;

  if (options.preserveAnimation && file.type === "image/gif" && file.size <= maxBytes) {
    return readAsDataUrl(file);
  }

  const decoded = await decode(file);
  try {
    let width = decoded.width;
    let height = decoded.height;
    const scale = Math.min(1, options.maxWidth / width, options.maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    let currentQuality = quality;
    let last = "";

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Не удалось обработать изображение");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded.source, 0, 0, width, height);

      let dataUrl = canvas.toDataURL("image/webp", currentQuality);
      if (!dataUrl.startsWith("data:image/webp")) {
        dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
      }
      last = dataUrl;
      if (dataUrlBytes(dataUrl) <= maxBytes) return dataUrl;

      currentQuality = Math.max(0.42, currentQuality - 0.08);
      width = Math.max(1, Math.round(width * 0.84));
      height = Math.max(1, Math.round(height * 0.84));
    }

    if (last) return last;
    throw new Error("Не удалось сжать изображение");
  } finally {
    decoded.close();
  }
}

export const imageLimits = {
  background: { maxWidth: 1920, maxHeight: 1080, maxBytes: 2_400_000, preserveAnimation: true },
  particle: { maxWidth: 512, maxHeight: 512, maxBytes: 480_000, quality: 0.82 },
  cover: { maxWidth: 1024, maxHeight: 1024, maxBytes: 1_200_000 },
} satisfies Record<string, ImageOptions>;
