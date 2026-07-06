const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeJson(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

export function decodeJson<T>(data: Uint8Array): T {
  return JSON.parse(decoder.decode(data)) as T;
}
