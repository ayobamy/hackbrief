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
// "k" is a thousand, "m", "M" or "million" a million, "bn" a billion; a letter that starts a word ("more") is none.
const SCALE = "(k|m|million|bn|billion)\\b";
const BEFORE = new RegExp(`(?:([$€£₦₹])|\\b(${CODES})\\s?)(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?(?:\\s?${SCALE})?`, "gi");
const AFTER = new RegExp(`\\b(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?(?:\\s?${SCALE})?\\s?(${CODES})\\b`, "gi");
const SCALES: Readonly<Record<string, number>> = { k: 1e3, m: 1e6, million: 1e6, bn: 1e9, billion: 1e9 };
const PRIZE_TOPIC = /\b(?:prizes?|awards?|winners?|winning|place|track|bounty|bounties|pool|grand|runner[- ]up|cash)\b/i;
const PRIZE_SECTION = /\b(?:prizes?|awards?|bount\w*)\b/i;

function toValue(digits: string, decimals: string | undefined, scale: string | undefined): number {
  const value = Number(`${digits.replace(/,/g, "")}${decimals ?? ""}`);
  return Math.round(value * (scale ? (SCALES[scale.toLowerCase()] ?? 1) : 1));
}

function amountsIn(sentence: string): Amount[] {
  const amounts: Amount[] = [];
  for (const match of sentence.matchAll(BEFORE)) {
    const [, symbol, code, digits = "", decimals, scale] = match;
    const currency = symbol ? (SYMBOLS[symbol] ?? symbol) : (code ?? "");
    amounts.push({ currency: currency.toUpperCase(), value: toValue(digits, decimals, scale) });
  }
  for (const match of sentence.matchAll(AFTER)) {
    const [, digits = "", decimals, scale, code = ""] = match;
    amounts.push({ currency: code.toUpperCase(), value: toValue(digits, decimals, scale) });
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
