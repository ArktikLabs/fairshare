// Receipt images on local disk. Files live under UPLOAD_DIR/receipts/ and are
// only ever served by /api/expenses/[id]/receipt after a membership check:
// never put UPLOAD_DIR under public/.

import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { HttpError } from "./expense-write";

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR || "./uploads");
}

function receiptPath(key: string, variant: "full" | "thumb") {
  if (!/^[a-f0-9]{32}$/.test(key)) throw new HttpError(400, "Bad receipt key");
  return path.join(uploadDir(), "receipts", `${key}${variant === "thumb" ? "-thumb" : ""}.jpg`);
}

/** Sniff the real type from the first bytes; the browser's MIME type is not trusted. */
export function sniffImageType(buf: Buffer): "jpeg" | "png" | "webp" | "heic" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand)) return "heic";
  }
  return null;
}

/**
 * Validate, auto-rotate, downscale and re-encode an upload as JPEG (which
 * drops EXIF, including GPS), plus a small thumbnail. Returns the new key.
 */
export async function saveReceipt(buf: Buffer): Promise<string> {
  if (buf.length === 0) throw new HttpError(400, "The file is empty");
  if (buf.length > MAX_RECEIPT_BYTES) throw new HttpError(413, "Receipts can be up to 8 MB");
  const kind = sniffImageType(buf);
  if (kind === "heic") {
    throw new HttpError(415, "HEIC photos are not supported yet. Choose JPEG/PNG, or set your camera to \"Most compatible\".");
  }
  if (!kind) throw new HttpError(415, "Upload a JPEG, PNG or WebP image");

  let full: Buffer;
  let thumb: Buffer;
  try {
    const base = sharp(buf, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
    full = await base
      .clone()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    thumb = await base
      .clone()
      .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 75 })
      .toBuffer();
  } catch {
    throw new HttpError(415, "That image could not be read. Try another photo.");
  }

  const key = randomBytes(16).toString("hex");
  await mkdir(path.join(uploadDir(), "receipts"), { recursive: true });
  await writeFile(receiptPath(key, "full"), full);
  await writeFile(receiptPath(key, "thumb"), thumb);
  return key;
}

export async function readReceipt(key: string, variant: "full" | "thumb"): Promise<Buffer | null> {
  try {
    return await readFile(receiptPath(key, variant));
  } catch {
    return null;
  }
}

export async function deleteReceiptFiles(key: string | null | undefined) {
  if (!key) return;
  await Promise.all([rm(receiptPath(key, "full"), { force: true }), rm(receiptPath(key, "thumb"), { force: true })]);
}
