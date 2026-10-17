import { displayAmount, parseMoney } from "../../lib/money";

// Adds the € symbol, since displayAmount has none.
export const eur = (amount: string | number) =>
  `€${displayAmount(typeof amount === "number" ? amount : parseMoney(amount))}`;
