const MAX_SIDE = 1920;

/** Redimensionne une photo dans le navigateur (1920 px au plus) avant l'envoi. */
async function shrink(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choisissez une photo JPEG, PNG ou WebP.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Photo trop lourde (25 Mo au plus).");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Photo illisible.");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // Les PNG (logos, transparence) restent en PNG ; les photos passent en JPEG.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Photo illisible."))), type, 0.85),
  );
}

export async function uploadSiteImage(file: File): Promise<{ fileId: string; url: string }> {
  const blob = await shrink(file);
  const form = new FormData();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  form.append("file", blob, `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${ext}`);
  const response = await fetch("/api/site/images", { method: "POST", body: form });
  const data = (await response.json().catch(() => ({}))) as {
    fileId?: string;
    url?: string;
    error?: string;
  };
  if (!response.ok || !data.fileId || !data.url) throw new Error(data.error ?? "Envoi impossible.");
  return { fileId: data.fileId, url: data.url };
}
