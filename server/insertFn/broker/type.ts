import { EquityRow } from "../equity/type.ts";
import { OptionRow } from "../option/type.ts";
import { FutureRow } from "../future/type.ts";

enum BrokerType {
  OPTION = "OPTION",
  EQUITY = "EQUITY",
  FUTURE = "FUTURE",
}

type Payload =
  | EquityRow
  | FutureRow
  | OptionRow[];

export { BrokerType, Payload, EquityRow, OptionRow, FutureRow };