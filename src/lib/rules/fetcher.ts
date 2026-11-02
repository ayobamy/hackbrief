import { Agent, fetch as undiciFetch } from "undici";

import { publicOnlyLookup } from "./address";
import type { Fetcher } from "./read";

// Every connection goes through the public-only lookup, so no redirect or DNS answer can point a page
// read at a private network, this machine or a cloud metadata address.
const agent = new Agent({ connect: { lookup: publicOnlyLookup() } });

/** The fetch the server reads event pages with. */
export const guardedFetch: Fetcher = async (url, init) => {
  const response = await undiciFetch(url, { ...init, dispatcher: agent });
  return new Response(response.body as ReadableStream<Uint8Array> | null, {
    status: response.status,
    headers: Object.fromEntries(response.headers),
  });
};
