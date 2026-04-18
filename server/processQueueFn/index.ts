import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { queueBroker } from "./broker/index.ts";

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // webhook payload from Supabase contains the inserted row
    // we use it only to identify which queue to drain
    const payload = await req.json();
    const result = await queueBroker(payload);

    return new Response(
      JSON.stringify({ success: true, ...result }) + "\n",
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Queue consumer error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }) + "\n",
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});