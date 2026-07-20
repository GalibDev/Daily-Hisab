import { NextResponse } from "next/server";

const allowedTypes = new Set(["application/pdf", "application/vnd.ms-excel", "text/csv"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const filename = String(form.get("filename") || "daily-hisab-export").replace(/[^a-zA-Z0-9._-]/g, "-");
  const type = String(form.get("type") || "application/octet-stream");
  const content = String(form.get("content") || "");

  if (!allowedTypes.has(type) || !content) {
    return NextResponse.json({ error: "Invalid download" }, { status: 400 });
  }

  const bytes = Buffer.from(content, "base64");
  return new Response(bytes, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.length),
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
