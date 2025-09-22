import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, previousResponseId, model: modelFromClient, instructions: instructionsFromClient, assistantId: assistantIdFromClient } = body as {
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      previousResponseId?: string;
      model?: string;
      instructions?: string;
      assistantId?: string;
    };

    const model = modelFromClient || process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const apiKey = (process.env.APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 401 });
    }
    const client = new OpenAI({ apiKey });

    const assistantId = (assistantIdFromClient || process.env.ASSISTANT_ID || "").trim();
    if (assistantId) {
      // Use Assistants API streaming
      const thread = await client.beta.threads.create({
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      });

      const run = await client.beta.threads.runs.stream(thread.id, { assistant_id: assistantId });

      const encoder = new TextEncoder();
      let isClosed = false;
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          const closeOnce = () => {
            if (isClosed) return;
            isClosed = true;
            try { controller.close(); } catch {}
          };
          run.on("textDelta", (delta) => {
            controller.enqueue(encoder.encode(delta.value));
          });
          run.on("end", closeOnce);
          run.on("error", closeOnce);
        },
        cancel() {
          try { run.abort(); } catch {}
        },
      });

      const headers = new Headers();
      headers.set("Content-Type", "text/plain; charset=utf-8");
      headers.set("Cache-Control", "no-cache");
      headers.set("X-Assistant-Id", assistantId);
      return new Response(readable, { headers });
    }

    const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
    const baseInstructions = instructionsFromClient ?? process.env.OPENAI_INSTRUCTIONS ?? "";
    const instructions = [baseInstructions, ...systemParts].filter(Boolean).join("\n\n");
    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const stream = await client.responses.stream({
      model,
      input: latestUserMessage,
      ...(instructions ? { instructions } : {}),
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      store: true,
    });

    let responseId: string | undefined = undefined;
    await new Promise<void>((resolve) => {
      stream.on("response.created", (event: unknown) => {
        const e = event as { response?: { id?: string } };
        responseId = e.response?.id;
        resolve();
      });
      stream.on("error", () => resolve());
      setTimeout(resolve, 200);
    });

    const encoder = new TextEncoder();
    let isClosed = false;
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        const closeOnce = () => {
          if (isClosed) return;
          isClosed = true;
          try {
            controller.close();
          } catch {}
        };

        stream.on("response.output_text.delta", (event: unknown) => {
          const e = event as { delta?: string };
          if (typeof e?.delta === "string") controller.enqueue(encoder.encode(e.delta));
        });
        stream.on("end", closeOnce);
        stream.on("error", closeOnce);
      },
      cancel() {
        try {
          stream.abort();
        } catch {}
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", "text/plain; charset=utf-8");
    headers.set("Cache-Control", "no-cache");
    if (responseId) headers.set("X-Response-Id", responseId);
    return new Response(readable, { headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
