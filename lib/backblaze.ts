import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Read an env var and strip any stray whitespace/newlines that can sneak in
// when pasting values into a hosting dashboard. A trailing newline in the key
// id or region otherwise breaks the signed Authorization header.
function env(name: string) {
  const v = process.env[name];
  return v ? v.trim() : v;
}

// Backblaze B2 is S3-compatible. These are SERVER-ONLY env vars (never NEXT_PUBLIC).
export const B2_BUCKET = env("B2_BUCKET") as string;

function client() {
  return new S3Client({
    region: env("B2_REGION"),
    endpoint: env("B2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: env("B2_KEY_ID") as string,
      secretAccessKey: env("B2_APP_KEY") as string,
    },
  });
}

// Short-lived URL the browser uses to upload a file straight to Backblaze.
export async function presignUpload(key: string) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: B2_BUCKET, Key: key }),
    { expiresIn: 3600 } // 1 hour to finish a large upload
  );
}

// Short-lived URL the browser uses to download a file (as an attachment).
export async function presignDownload(key: string, filename?: string) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename.replace(/"/g, "")}"`
        : undefined,
    }),
    { expiresIn: 300 } // 5 minutes
  );
}

// Short-lived URL the browser uses to DISPLAY a preview frame inline (an <img>).
// Same idea as presignDownload, but inline + image/jpeg so the browser renders
// it instead of downloading it. Used by the in-portal slice viewer.
export async function presignView(key: string, expiresIn = 3600) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      ResponseContentDisposition: "inline",
      ResponseContentType: "image/jpeg",
    }),
    { expiresIn } // 1 hour covers a normal viewing session
  );
}

// Read a small text object (e.g. the preview manifest.json) straight into a
// string, server-side. No presigning needed — this runs on our own server.
export async function getObjectText(key: string) {
  const res = await client().send(
    new GetObjectCommand({ Bucket: B2_BUCKET, Key: key })
  );
  return (await (res.Body as any).transformToString()) as string;
}

// One-off: tell Backblaze which website origins may upload/download from the
// browser. Allowing PUT is what lets the direct browser upload work.
export async function setBucketCors(origins: string[]) {
  await client().send(
    new PutBucketCorsCommand({
      Bucket: B2_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            ID: "mycbctBrowser",
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedOrigins: origins,
            AllowedHeaders: ["*"],
            ExposeHeaders: ["etag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
  return origins;
}
