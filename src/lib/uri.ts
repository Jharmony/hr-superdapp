export function resolveUri(uri: string): string {
  const u = uri.trim();
  if (u.startsWith('ipfs://')) {
    const hash = u.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }
  return u;
}
