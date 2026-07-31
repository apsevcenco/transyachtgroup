import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const BOOKING_PHOTO_BUCKET = "booking_private";

function storageClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Private storage is not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function bookingPhotoPath(value: string): string {
  if (!value.startsWith("http")) return value.replace(/^\/+/, "");
  const url = new URL(value);
  const marker = `/object/sign/${BOOKING_PHOTO_BUCKET}/`;
  const index = url.pathname.indexOf(marker);
  if (index < 0) throw new Error("Invalid booking photo URL");
  return decodeURIComponent(url.pathname.slice(index + marker.length));
}

export async function signedBookingPhoto(pathOrUrl: string): Promise<string> {
  const path = bookingPhotoPath(pathOrUrl);
  const { data, error } = await storageClient()
    .storage.from(BOOKING_PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function signBookingPhotos<T extends { bookingPhotos?: unknown }>(record: T): Promise<T> {
  const photos = Array.isArray(record.bookingPhotos)
    ? record.bookingPhotos.filter((item): item is string => typeof item === "string")
    : [];
  const signed = await Promise.all(
    photos.map(async (photo) => {
      try { return await signedBookingPhoto(photo); } catch { return null; }
    }),
  );
  return {
    ...record,
    bookingPhotos: signed.filter((photo): photo is string => photo != null),
  };
}

export async function uploadBookingPhoto(buffer: Buffer, contentType: string): Promise<{ path: string; signedUrl: string }> {
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `booking-photos/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`;
  const { error } = await storageClient().storage.from(BOOKING_PHOTO_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    // Supabase expects only the max-age value here, not a full Cache-Control
    // header. It adds the header syntax itself.
    cacheControl: "3600",
  });
  if (error) throw error;
  return { path, signedUrl: await signedBookingPhoto(path) };
}

export async function uploadPublicImage(
  buffer: Buffer,
  contentType: string,
  scope: "vehicles" | "content-bg" | "content-office",
): Promise<string> {
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${scope}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`;
  const storage = storageClient().storage.from("vehicle_images");
  const { error } = await storage.upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function deletePublicImage(urlValue: string): Promise<boolean> {
  let url: URL;
  try { url = new URL(urlValue); } catch { return false; }
  const configuredUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!configuredUrl || url.hostname !== new URL(configuredUrl).hostname) return false;
  const marker = "/object/public/vehicle_images/";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return false;
  const path = decodeURIComponent(url.pathname.slice(index + marker.length));
  if (!path || path.includes("..")) return false;
  const { error } = await storageClient().storage.from("vehicle_images").remove([path]);
  if (error) throw error;
  return true;
}
