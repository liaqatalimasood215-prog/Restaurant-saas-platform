/** A random id. Not crypto.randomUUID: browsers give it only on localhost and HTTPS, not on a Wi-Fi address. */
export function newId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
