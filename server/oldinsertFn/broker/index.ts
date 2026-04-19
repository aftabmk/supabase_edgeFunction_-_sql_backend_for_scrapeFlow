import { handleOption } from "../utils/option.ts";
import { handleFuture } from "../utils/future.ts";
import { handleEquity } from "../utils/equity.ts";
import { BrokerType } from "./type.ts";

type TypedObject = {
  type: BrokerType;
  [key: string]: unknown;
};

type Payload = TypedObject | TypedObject[];

export async function broker(payload: Payload) {
  let type: BrokerType;
  let result: unknown;

  if (Array.isArray(payload)) {
    if (payload.length === 0) throw new Error("Empty payload");
    type = payload[0].type;
  } else {
    type = payload.type;
  }

  switch (type) {
    case BrokerType.OPTION:
      result = await handleOption(payload);
      break;

    case BrokerType.EQUITY:
      result = await handleEquity(payload);
      break;

    case BrokerType.FUTURE:
      result = await handleFuture(payload);
      break;

    default:
      throw new Error(`Unsupported type: ${type}`);
  }

  return { type, result };
}
