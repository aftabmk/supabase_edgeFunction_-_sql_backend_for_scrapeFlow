import { supabase } from "../supabaseClient.ts";

type EquityRow = {
  exchange:string;
  type:string;
  key: string;
  ltp: number;
  pc: number;
  ts: string;
  ul: string;
  vol: number;
};

/**
 * Insert / upsert a single equity row
 */
async function processEquityRow(row: EquityRow) {
  const { key, ltp, pc, ts, ul, vol } = row;
  const items = {key,ltp,pc,ts,ul,vol};

  const { error } = await supabase
    .from("equity_table")
    .upsert(items, { onConflict: ["ts", "key"] });

  if (error) {
    throw new Error(`Insert failed in equity_table (${key}): ${error.message}`);
  }

  return {
    table: "equity_table",
    key,
  };
}

/**
 * Handle equity payload
 * (single object, batch-ready)
 */
export async function handleEquity(payload: EquityRow) {
  return processEquityRow(payload);
}

