import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";

// Addresses a server must never be sent to when it fetches a page: private networks, loopback,
// link-local (cloud metadata lives there), carrier-grade NAT, documentation and reserved ranges.
const BLOCKED = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOCKED.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 127],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  BLOCKED.addSubnet(network, prefix, "ipv6");
}

const MAPPED_V4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/** Whether an IP address is on the public internet, so a fetch may connect to it. */
export function isPublicAddress(address: string): boolean {
  const mapped = MAPPED_V4.exec(address)?.[1];
  if (mapped) {
    return isPublicAddress(mapped);
  }
  const family = isIP(address);
  if (family === 0) {
    return false;
  }
  return !BLOCKED.check(address, family === 4 ? "ipv4" : "ipv6");
}

type Resolve = (hostname: string, callback: (error: Error | null, addresses: LookupAddress[]) => void) => void;
type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

const systemResolve: Resolve = (hostname, callback) =>
  dnsLookup(hostname, { all: true }, (error, addresses) => callback(error, addresses ?? []));

/**
 * A DNS lookup for outgoing connections that refuses any name resolving to a non-public address. It
 * runs when the connection is made, so a name cannot pass a check and then resolve elsewhere.
 */
export function publicOnlyLookup(resolve: Resolve = systemResolve) {
  return (hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
    resolve(hostname, (error, addresses) => {
      if (error) {
        callback(error, "");
        return;
      }
      const blocked = addresses.find(({ address }) => !isPublicAddress(address));
      const first = addresses[0];
      if (blocked || !first) {
        callback(new Error(`${hostname} is not a public address`), "");
        return;
      }
      if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, first.address, first.family);
      }
    });
  };
}
