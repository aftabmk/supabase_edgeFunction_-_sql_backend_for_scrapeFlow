import { handleOption } from "../option/index.ts";
import { handleFuture } from "../future/index.ts";
import { handleEquity } from "../equity/index.ts";

import { Payload, BrokerType, EquityRow, FutureRow, OptionRow, Result } from "./type.ts";

// --- function overloads for perfect typing ---
export async function broker(payload: OptionRow[]): Promise<{ type: BrokerType; result: Result }>;
export async function broker(payload: EquityRow | FutureRow): Promise<{ type: BrokerType; result: Result }>;

// --- implementation ---
export async function broker(payload: Payload) {
  // ✅ Case 1: Option array
  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      throw new Error("Empty payload");
    }

    // ensure all are OPTION
    if (!payload.every(p => p.type === BrokerType.OPTION)) {
      throw new Error("Invalid payload: array must contain only OPTION rows");
    }

    const result = await handleOption(payload);

    return {
      type: BrokerType.OPTION,
      result
    };
  }

  // ✅ Case 2: Single object
  switch (payload.type) {
    case BrokerType.EQUITY: {
      const result = await handleEquity(payload as EquityRow);
      return { type: BrokerType.EQUITY, result };
    }

    case BrokerType.FUTURE: {
      const result = await handleFuture(payload as FutureRow);
      return { type: BrokerType.FUTURE, result };
    }

    // safeguard: OPTION must be array
    case BrokerType.OPTION:
      throw new Error("OPTION payload must be an array");

    default:
      throw new Error(`Unsupported type: ${payload.type}`);
  }
}
