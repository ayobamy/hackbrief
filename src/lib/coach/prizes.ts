import { toSentences } from "./text";

export interface Amount {
  currency: string;
  value: number;
}

export interface PrizeLine {
  text: string;
  amounts: Amount[];
}

const SYMBOLS: Readonly<Record<string, string>> = { $: "USD", "€": "EUR", "£": "GBP", "₦": "NGN", "₹": "INR" };
const CODES = "USD|EUR|GBP|NGN|INR|CAD|AUD|USDC";
const BEFORE = new RegExp(`(?:([$€£₦₹])|\\b(${CODES})\\s?)(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?\\s?([kK]\\b)?`, "g");
const AFTER = new RegExp(`\\b(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?\\s?([kK])?\\s?(${CODES})\\b`, "g");
const PRIZE_TOPIC = /\b(?:prizes?|awards?|winners?|winning|place|track|bounty|bounties|pool|grand|runner[- ]up|cash)\b/i;
const PRIZE_SECTION = /\b(?:prizes?|awards?|bount\w*)\b/i;

function toValue(digits: string, thousands: string | undefined): number {
  const value = Number(digits.replace(/,/g, ""));
  return thousands ? value * 1000 : value;
}

function amountsIn(sentence: string): Amount[] {
  const amounts: Amount[] = [];
  for (const match of sentence.matchAll(BEFORE)) {
    const [, symbol, code, digits = "", thousands] = match;
    const currency = symbol ? (SYMBOLS[symbol] ?? symbol) : (code ?? "");
    amounts.push({ currency: currency.toUpperCase(), value: toValue(digits, thousands) });
  }
  for (const match of sentence.matchAll(AFTER)) {
    const [, digits = "", thousands, code = ""] = match;
    amounts.push({ currency: code.toUpperCase(), value: toValue(digits, thousands) });
  }
  return amounts;
}

/** The sentences about prizes that name an amount, with the amounts parsed. */
export function extractPrizes(input: string): PrizeLine[] {
  return toSentences(input)
    .filter(({ text, section }) => PRIZE_TOPIC.test(text) || PRIZE_SECTION.test(section))
    .map(({ text }) => ({ text, amounts: amountsIn(text) }))
    .filter((line) => line.amounts.length > 0);
}

/** The largest single amount in each currency, in the order the currencies first appear. */
export function largestPrizes(lines: readonly PrizeLine[]): Amount[] {
  const largest = new Map<string, number>();
  for (const { currency, value } of lines.flatMap((line) => line.amounts)) {
    largest.set(currency, Math.max(value, largest.get(currency) ?? 0));
  }
  return [...largest].map(([currency, value]) => ({ currency, value }));
}
