// api/chat.js — Vercel Serverless Function (Node.js runtime, ESM)
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message, context, knowledge } = req.body || {};
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = [
      "あなたは初心者PMを支援する日本語アシスタントです。",
      "用語はやさしく、手順は箇条書きで、具体例も添えて説明します。",
      "提供された Knowledge を優先して参照し、不足は断言せず質問します。"
    ].join(" ");

    const user = [
      `User message: ${message ?? ""}`,
      `Context (project): ${JSON.stringify(context ?? {}, null, 2)}`,
      `Knowledge:\n${knowledge ?? "(none)"}`
    ].join("\n\n");

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });

    const reply = resp.choices?.[0]?.message?.content || "(no reply)";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ reply: "（サーバーエラー）AI応答に失敗しました。" });
  }
}
