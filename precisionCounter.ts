export function makeTimer(): [number, number] {
  return process.hrtime();
}
export function timeDiffToNowInMs(previousCounter: [number, number]): number {
  const NS_PER_SEC = 1e9
  const NS_TO_MS = 1e6
  const diff = process.hrtime(previousCounter)

  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
}