import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PDFDocument } from "pdf-lib";

// const cacheDir: Directory = Paths.cache; // equivalent to FileSystem.cacheDirectory
// const file = new File(Paths.cache, 'example.txt'); // lives in the cache directory

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "") || "export";

async function ensureSharingAvailable() {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
}

async function fetchImageBytes(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Impossible de récupérer l'image pour l'export.");
  }

  const mimeType = response.headers.get("content-type") ?? "";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = arrayBuffer.slice(0);

  const extension = mimeType.includes("png")
    ? "png"
    : mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "jpg"
      : imageUrl.toLowerCase().endsWith(".png")
        ? "png"
        : "jpg";

  return {
    data: new Uint8Array(buffer),
    mimeType: mimeType || `image/${extension}`,
    extension,
  };
}

async function savePdfToCache(imageUrls: string[], fileName: string) {
  const pdfDoc = await PDFDocument.create();

  for (const imageUrl of imageUrls) {
    const { data, mimeType } = await fetchImageBytes(imageUrl);
    const embed = mimeType.includes("png")
      ? await pdfDoc.embedPng(data)
      : await pdfDoc.embedJpg(data);

    const page = pdfDoc.addPage([embed.width, embed.height]);
    page.drawImage(embed, {
      x: 0,
      y: 0,
      width: embed.width,
      height: embed.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const file = new File(Paths.cache, `${sanitizeFileName(fileName)}.pdf`);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(pdfBytes);
  const targetPath = file.uri;
  return targetPath;
}

async function shareFile(path: string, mimeType: string, dialogTitle?: string) {
  await ensureSharingAvailable();
  await Sharing.shareAsync(path, {
    mimeType,
    dialogTitle,
  });
}

export async function exportProjectToPdf(title: string, pages: string[]) {
  const images = pages;
  if (!images.length) {
    throw new Error("Aucune page à exporter.");
  }

  const pdfPath = await savePdfToCache(images, `${title}-projet`);
  await shareFile(pdfPath, "application/pdf", "Exporter le projet");
  return pdfPath;
}
