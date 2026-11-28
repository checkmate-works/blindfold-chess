import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { callMobileApi, errorCodeOf } from "../../auth/api-client";

/**
 * The side the picked photo is scaled down to before it is sent. The server
 * stores a 256px square (`replaceAvatar` on the web); twice that keeps the
 * crop sharp through the server's own resize while keeping the upload far
 * under the web's 2 MB cap, which a full-size phone photo would exceed.
 */
const UPLOAD_PIXEL_SIZE = 512;
const UPLOAD_JPEG_QUALITY = 0.85;

/**
 * - `cancelled` — the player closed the picker without choosing.
 * - `signedOut` / `offline` / `unavailable` — as `callMobileApi`.
 * - anything else — the server's error code (`rateLimited`,
 *   `invalid_file_type`, `file_too_large`, `upload_failed`, …).
 */
export type AvatarUploadResult =
  { avatarUrl: string } | { error: "cancelled" | string };

/**
 * Lets the player pick a photo, crops it square, and stores it as the
 * account's avatar (`POST /avatar`).
 *
 * The library opens through the system photo picker (PHPicker on iOS), which
 * runs outside the app and hands back only the chosen photo, so iOS asks for
 * no photo-library permission. There is no camera option: that would need a
 * camera permission for one rarely used path.
 *
 * The photo is re-encoded as JPEG on the device whatever it was (HEIC on
 * most iPhones), since the server takes JPEG, PNG and WebP only.
 */
export async function pickAndUploadAvatar(): Promise<AvatarUploadResult> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = picked.canceled ? undefined : picked.assets[0];
  if (!asset) return { error: "cancelled" };

  const rendered = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: UPLOAD_PIXEL_SIZE, height: UPLOAD_PIXEL_SIZE })
    .renderAsync();
  const image = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: UPLOAD_JPEG_QUALITY,
  });

  const form = new FormData();
  // React Native's FormData takes a file as { uri, name, type } and streams
  // it from disk; the DOM typing knows only Blob.
  form.append("file", {
    uri: image.uri,
    name: "avatar.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const response = await callMobileApi("/avatar", {
    method: "POST",
    body: form,
  });
  if (typeof response === "string") return { error: response };
  if (!response.ok) {
    return { error: (await errorCodeOf(response)) ?? "serverError" };
  }
  const body = (await response.json().catch(() => ({}))) as {
    avatarUrl?: unknown;
  };
  return typeof body.avatarUrl === "string"
    ? { avatarUrl: body.avatarUrl }
    : { error: "serverError" };
}

/** Clears the avatar (`DELETE /avatar`). Returns null on success. */
export async function removeAvatar(): Promise<string | null> {
  const response = await callMobileApi("/avatar", { method: "DELETE" });
  if (typeof response === "string") return response;
  if (response.ok) return null;
  return (await errorCodeOf(response)) ?? "serverError";
}
