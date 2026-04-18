import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { broker } from "./broker/index.ts";

serve(async (req : Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const { type } = await broker(payload);

    return new Response(
      JSON.stringify({ type ,success: true }) + '\n',
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }) + '\n',
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});