/**
 * Fast, deterministic 32-bit pseudo-random number generator (Mulberry32).
 * Returns floating-point values in [0, 1).
 * Never mutates global Math.random or any hidden global state.
 */
export function createRng(seed: number = 42): () => number {
  let s = Math.floor(Math.abs(seed)) >>> 0;
  // Mix initial seed if 0
  if (s === 0) s = 0x6d2b79f5;

  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
