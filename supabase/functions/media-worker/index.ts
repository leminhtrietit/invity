import { createClient } from "npm:@supabase/supabase-js@2";
import { ImageMagick, initializeImageMagick, MagickFormat } from "npm:@imagemagick/magick-wasm@0.0.38";

const wasmBytes = await Deno.readFile(new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.38")));
await initializeImageMagick(wasmBytes);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type MediaAsset = {
  id: string;
  event_id: string;
  owner_app_user_id: string;
  kind: "cover" | "album" | "audio";
  storage_key: string;
};

async function removeAssets(assets: Array<MediaAsset & { variants?: Record<string, string> }>) {
  const paths = [...new Set(assets.flatMap((asset) => [asset.storage_key, ...Object.values(asset.variants ?? {})]))];
  if (paths.length) {
    const { error } = await supabase.storage.from("event-media").remove(paths);
    if (error) throw new Error("MEDIA_CLEANUP_FAILED");
  }
}

function isMp3(bytes: Uint8Array) {
  return (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)
    || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
}

function isM4a(bytes: Uint8Array) {
  return bytes.length > 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

async function processAudio(asset: MediaAsset, bytes: Uint8Array) {
  const detected = isMp3(bytes) ? "audio/mpeg" : isM4a(bytes) ? "audio/mp4" : null;
  if (!detected) throw new Error("UNSUPPORTED_AUDIO_CONTENT");
  const { error } = await supabase.from("media_assets").update({
    status: "ready",
    detected_mime_type: detected,
    variants: { original: asset.storage_key },
    failure_code: null,
    updated_at: new Date().toISOString(),
  }).eq("id", asset.id);
  if (error) throw error;
}

async function processImage(asset: MediaAsset, bytes: Uint8Array) {
  let sourceWidth = 0;
  let sourceHeight = 0;
  ImageMagick.read(bytes, (image) => { sourceWidth = image.width; sourceHeight = image.height; });
  if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight > 50_000_000) throw new Error("IMAGE_DIMENSIONS_INVALID");

  const variants: Record<string, string> = {};
  for (const targetWidth of [640, 1280, 1920]) {
    const width = Math.min(targetWidth, sourceWidth);
    const output = ImageMagick.read(bytes, (image): Uint8Array => {
      image.autoOrient();
      image.strip();
      image.resize(width, 0);
      image.quality = 82;
      return image.write(MagickFormat.WebP, (data) => data);
    });
    const path = `${asset.owner_app_user_id}/${asset.event_id}/processed/${asset.id}-${width}.webp`;
    const { error } = await supabase.storage.from("event-media").upload(path, output, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (error) throw error;
    variants[`w${width}`] = path;
  }
  const { error } = await supabase.from("media_assets").update({
    status: "ready",
    detected_mime_type: "image/webp",
    width: sourceWidth,
    height: sourceHeight,
    variants,
    failure_code: null,
    updated_at: new Date().toISOString(),
  }).eq("id", asset.id);
  if (error) throw error;
}

Deno.serve(async (request) => {
  const workerSecret = Deno.env.get("MEDIA_WORKER_SECRET");
  const maintenanceMode = Boolean(workerSecret && request.headers.get("X-Worker-Secret") === workerSecret);
  let authUserId: string | undefined;
  if (!maintenanceMode) {
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    authUserId = authData.user.id;
  }
  const workerId = `edge-${crypto.randomUUID()}`;
  const { data: jobs, error: claimError } = maintenanceMode
    ? await supabase.rpc("claim_media_jobs", { p_worker_id: workerId, p_limit: 3, p_lease_seconds: 300 })
    : await supabase.rpc("claim_user_media_jobs", { p_auth_user_id: authUserId, p_worker_id: workerId, p_limit: 3, p_lease_seconds: 300 });
  if (claimError) return Response.json({ error: "CLAIM_FAILED" }, { status: 500 });

  const results = [];
  for (const job of jobs ?? []) {
    try {
      if (job.kind === "account.delete") {
        const appUserId = job.payload?.appUserId;
        const { data: assets, error: assetsError } = await supabase.from("media_assets").select("id,event_id,owner_app_user_id,kind,storage_key,variants").eq("owner_app_user_id", appUserId);
        if (assetsError || !appUserId) throw new Error("ACCOUNT_CLEANUP_LOOKUP_FAILED");
        await removeAssets((assets ?? []) as Array<MediaAsset & { variants?: Record<string, string> }>);
        const { error: purgeError } = await supabase.rpc("purge_account_data", { p_app_user_id: appUserId, p_job_id: job.id, p_worker_id: workerId });
        if (purgeError) throw new Error("ACCOUNT_PURGE_FAILED");
        results.push({ jobId: job.id, status: "succeeded" });
        continue;
      }
      const mediaAssetId = job.payload?.mediaAssetId;
      const { data: asset, error: assetError } = await supabase.from("media_assets").select("id,event_id,owner_app_user_id,kind,storage_key,variants").eq("id", mediaAssetId).single<MediaAsset & { variants?: Record<string, string> }>();
      if (assetError || !asset) throw new Error("MEDIA_ASSET_NOT_FOUND");
      if (job.kind === "media.cleanup") {
        await removeAssets([asset]);
        const { error: deleteError } = await supabase.from("media_assets").delete().eq("id", asset.id);
        if (deleteError) throw new Error("MEDIA_CLEANUP_DELETE_FAILED");
        await supabase.rpc("finish_job", { p_job_id: job.id, p_worker_id: workerId, p_succeeded: true });
        results.push({ jobId: job.id, status: "succeeded" });
        continue;
      }
      await supabase.from("media_assets").update({ status: "processing", failure_code: null }).eq("id", asset.id);
      const { data: file, error: downloadError } = await supabase.storage.from("event-media").download(asset.storage_key);
      if (downloadError || !file) throw new Error("MEDIA_DOWNLOAD_FAILED");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (asset.kind === "audio") await processAudio(asset, bytes);
      else await processImage(asset, bytes);
      await supabase.rpc("finish_job", { p_job_id: job.id, p_worker_id: workerId, p_succeeded: true });
      results.push({ jobId: job.id, status: "succeeded" });
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 100) : "MEDIA_PROCESSING_FAILED";
      const mediaAssetId = job.payload?.mediaAssetId;
      if (mediaAssetId) await supabase.from("media_assets").update({ status: "failed", failure_code: code }).eq("id", mediaAssetId);
      await supabase.rpc("finish_job", { p_job_id: job.id, p_worker_id: workerId, p_succeeded: false, p_error_code: code });
      await supabase.from("jobs").update({ status: "failed", available_at: new Date().toISOString(), locked_by: null, locked_until: null, last_error_code: code }).eq("id", job.id);
      results.push({ jobId: job.id, status: "failed", code });
    }
  }
  return Response.json({ processed: results.length, succeeded: results.filter((result) => result.status === "succeeded").length });
});
