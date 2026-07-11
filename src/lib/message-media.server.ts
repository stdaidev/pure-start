import { createHash } from "node:crypto";

const MEDIA_BUCKET = "message-media";
const STORAGE_PREFIX = `storage://${MEDIA_BUCKET}/`;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSION: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

function decodeDataUrl(source: string): { bytes: Buffer; contentType: string } | null {
  const match = /^data:([^;,]+);base64,([a-z0-9+/=\r\n]+)$/i.exec(source);
  if (!match) return null;

  const contentType = match[1].toLowerCase();
  if (!MIME_EXTENSION[contentType]) return null;

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_MEDIA_BYTES) return null;
  return { bytes, contentType };
}

export async function persistInboundMedia(input: {
  workspaceId: string;
  conversationId: string;
  providerMessageId: string;
  mediaType: string;
  source: string | undefined;
}): Promise<string | null> {
  if (!input.source) return null;

  // URLs comuns continuam suportadas. Data URLs nunca devem ir para o Postgres.
  if (!input.source.startsWith("data:")) return input.source;
  if (input.mediaType !== "image" && input.mediaType !== "audio") return null;

  const decoded = decodeDataUrl(input.source);
  if (!decoded) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const objectId = createHash("sha256").update(input.providerMessageId).digest("hex");
  const extension = MIME_EXTENSION[decoded.contentType];
  const objectPath = `${input.workspaceId}/${input.conversationId}/${objectId}.${extension}`;
  const { error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .upload(objectPath, new Uint8Array(decoded.bytes), {
      contentType: decoded.contentType,
      cacheControl: "3600",
      upsert: false,
    });

  // Um retry do webhook pode encontrar o mesmo objeto antes da verificacao no banco.
  if (error && !/duplicate|already exists/i.test(error.message)) {
    throw new Error("media storage upload failed");
  }
  return `${STORAGE_PREFIX}${objectPath}`;
}

export async function resolvePrivateMediaUrls<T extends { media_url: string | null }>(
  rows: T[],
): Promise<T[]> {
  const paths = Array.from(
    new Set(
      rows
        .map((row) => row.media_url)
        .filter((value): value is string => Boolean(value?.startsWith(STORAGE_PREFIX)))
        .map((value) => value.slice(STORAGE_PREFIX.length)),
    ),
  );
  if (paths.length === 0) return rows;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, 900);
  if (error) {
    console.error("[message-media] signed URL generation failed", error.name);
    return rows.map((row) =>
      row.media_url?.startsWith(STORAGE_PREFIX) ? { ...row, media_url: null } : row,
    );
  }

  const signedByPath = new Map(
    (data ?? [])
      .filter((entry) => entry.signedUrl)
      .map((entry) => [entry.path, entry.signedUrl] as const),
  );
  return rows.map((row) => {
    if (!row.media_url?.startsWith(STORAGE_PREFIX)) return row;
    const path = row.media_url.slice(STORAGE_PREFIX.length);
    return { ...row, media_url: signedByPath.get(path) ?? null };
  });
}
