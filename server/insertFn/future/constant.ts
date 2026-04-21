import { Exchange } from "./type";

const { QUEUE_NAME_FUTURE, EXCHANGE, FUTURE_TABLE } = Deno.env.toObject();

const QUEUE_NAME = QUEUE_NAME_FUTURE;
const MULTIPLIER : Exchange = { EXCHANGE_1 : 65, EXCHANGE_2 : 20};

export { MULTIPLIER, QUEUE_NAME, EXCHANGE, FUTURE_TABLE };