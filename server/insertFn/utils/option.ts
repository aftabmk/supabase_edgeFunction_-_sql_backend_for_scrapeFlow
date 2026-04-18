import { supabase } from "../supabaseClient.ts";

type OptionRow = {
  exchange: string;
  type: string;
  ts: string;
  key: string;
  str: number;
  exp: string;
  ul: string;
  ulv: number;
  ce: Record<string, unknown>;
  pe: Record<string, unknown>;
};

/**
 * Insert one option row (main + payload)
 */
async function processOptionRow(row: OptionRow) {
  const { ts, key, str, exp, ul, ulv, ce, pe } = row;

  // 1️⃣ Upsert main option row
  const mainRow = { ts, key, exp, str, ul, ulv };

  const { data, error } = await supabase
    .from("option_table")
    .upsert(mainRow, { onConflict: ["ts", "key", "ul"] });

  if (error) {
    throw new Error(`Insert failed in option_table (${key}): ${error.message}`);
  }

  // 2️⃣ Build payload row
  const payloadRow = {
    ul,ts,key,
    ...Object.fromEntries(
      Object.entries(ce ?? {}).map(([key, val]) => [`ce_${key}`, val]) // prefix
    ),
    ...Object.fromEntries(
      Object.entries(pe ?? {}).map(([key, val]) => [`pe_${key}`, val]) // prefix
    ),
  };

  // 3️⃣ Upsert payload
  const { error: payloadErr } = await supabase
    .from("option_payload_table")
    .upsert(payloadRow, { onConflict: ["ts", "key", "ul"] });

  if (payloadErr) {
    throw new Error(
      `Payload insert failed (${key}): ${payloadErr.message}`
    );
  }

  return {
    table: "option_table",
    // id,
    key,
  };
}

/**
 * Handle option payload (array)
 */
export async function handleOption(payload: OptionRow[]) {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("Option payload must be a non-empty array");
  }

  // run in parallel
  return Promise.all(payload.map(processOptionRow));
}
