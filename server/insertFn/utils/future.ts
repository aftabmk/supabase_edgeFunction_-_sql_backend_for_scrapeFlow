import { supabase } from "../supabaseClient.ts";

type FutureRow = {
  exchange:string;
  type : string;
  ts: string;
  key: string;
  exp: string;
  vol: number;
  ltp: number;
  oi: number;
  tto: number;
  ul: string;
  ulv: number;
};

/**
 * Insert / upsert a single future row
 */
async function processFutureRow(row: FutureRow) {
  const { ts, key, exp, vol, ltp, oi, tto, ul, ulv } = row;
  const items = {ts,key,exp,vol,ltp,oi,tto,ul,ulv};

  const { error } = await supabase
    .from("future_table")
    .upsert(items, { onConflict: ["ts", "key"] });

  if (error) {
    throw new Error(`Insert failed in future_table (${key}): ${error.message}`);
  }

  return {
    table: "future_table",
    key,
  };
}

/**
 * Handle future payload
 * (currently single object, but batch-ready)
 */
export async function handleFuture(payload: FutureRow) {
  return processFutureRow(payload);
}
