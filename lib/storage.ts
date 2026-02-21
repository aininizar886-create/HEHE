import "server-only";

import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/supabase";

const BUCKET_NAME = (process.env.SUPABASE_STORAGE_BUCKET ?? "chatapp").trim();
let bucketReady = false;

const parseDataUrl = (value: string) => {
  if (!value.startsWith("data:")) return null;
  const match = value.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
};

const ensureBucket = async () => {
  if (bucketReady) return;
  const { data, error } = await supabaseAdmin.storage.listBuckets();
  if (!error && data?.some((item) => item.name === BUCKET_NAME)) {
    bucketReady = true;
    return;
  }
  const create = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
    public: true,
  });
  if (!create.error) {
    bucketReady = true;
  }
};

export const uploadDataUrl = async (dataUrl: string, pathPrefix: string) => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  const extension = parsed.mime.split("/")[1] ?? "bin";
  const filename = `${pathPrefix}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(parsed.data, "base64");

  await ensureBucket();
  const upload = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filename, buffer, { contentType: parsed.mime, upsert: true });
  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filename);
  return data.publicUrl;
};
