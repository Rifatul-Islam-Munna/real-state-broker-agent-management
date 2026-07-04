export function createRequire() {
  return () => {
    throw new Error("Node.js require is unavailable in the browser PDF designer.")
  }
}
