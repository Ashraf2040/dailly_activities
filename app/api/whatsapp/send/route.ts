// app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from "next/server";

const WHATS_TOKEN = process.env.WHATSAPP_TOKEN!;          // permanent or app token
const WHATS_PHONE_ID = process.env.WHATSAPP_PHONE_ID!;    // from Meta app

export async function POST(req: NextRequest) {
  try {
    const { to, text } = await req.json();
    if (!to || !text) return NextResponse.json({ error: "to and text required" }, { status: 400 });

    const resp = await fetch(`https://graph.facebook.com/v20.0/${WHATS_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: text }
      })
    });

    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: data?.error?.message || "Send failed" }, { status: 400 });
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
