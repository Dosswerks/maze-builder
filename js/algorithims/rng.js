/**
 * Seeded Random Number Generator - Mulberry32 PRNG
 * Produces deterministic sequences from a 32-bit seed.
 */

/**
 * Creates a seeded PRNG using the Mulberry32 algorithm.
 * @param {number} seed - 32-bit unsigned integer seed
 * @returns {() => number} Function returning values in [0, 1)
 */
export function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a random 32-bit unsigned integer seed.
 * @returns {number} Random seed value
 */
export function randomSeed() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0];
}
