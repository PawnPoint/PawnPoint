export function nanoid(size = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  crypto.getRandomValues(new Uint8Array(size)).forEach((v) => {
    id += chars[v % chars.length];
  });
  return id;
}
