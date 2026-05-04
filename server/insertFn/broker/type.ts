import { EquityRow } from "../equity/type.ts";
import { OptionRow } from "../option/type.ts";
import { FutureRow } from "../future/type.ts";

type Payload =
  | EquityRow
  | FutureRow
  | OptionRow[];

type Result = {
  key : string,
  table : string
};

export type { Payload, EquityRow, OptionRow, FutureRow, Result };