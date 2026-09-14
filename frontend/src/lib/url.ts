/** Returns true only for http(s) URLs that parse successfully. */
export function isSafeHttpUrl (url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}
