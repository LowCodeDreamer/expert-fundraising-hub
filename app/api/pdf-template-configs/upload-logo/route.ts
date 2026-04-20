import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — it's a logo
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export const runtime = "nodejs";

export async function POST(request: Request) {
  if ((await cookies()).get("admin_session")?.value !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file field must be a File" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${file.size} > ${MAX_BYTES} bytes)` },
      { status: 400 }
    );
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.includes(mime)) {
    return NextResponse.json(
      { error: `Unsupported MIME type: ${mime}` },
      { status: 400 }
    );
  }

  const ext = mimeToExt(mime);
  const path = `logos/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createServiceClient();
  const { error: uploadError } = await supabase.storage
    .from("pdf-assets")
    .upload(path, buffer, { contentType: mime, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data } = supabase.storage.from("pdf-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}
