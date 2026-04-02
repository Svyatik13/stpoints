// ═══════════════════════════════════════════════
// ST-Points Mining Web Worker
// ═══════════════════════════════════════════════
// This runs in a separate thread. It has NO access to DOM,
// localStorage, or any balance state. It can ONLY compute
// hashes and report results back to the main thread.
// The server is the SOLE authority for crediting rewards.
// ═══════════════════════════════════════════════

self.onmessage = async function (e) {
  const { prefix, target, challengeId } = e.data;
  let nonce = 0;
  let hashesComputed = 0;
  const REPORT_INTERVAL = 2500; // Report progress every N hashes

  while (true) {
    const input = prefix + nonce.toString();

    // Use Web Crypto API for SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    hashesComputed++;

    // Check if hash meets difficulty target
    if (hashHex < target) {
      self.postMessage({
        type: 'SOLUTION',
        challengeId: challengeId,
        nonce: nonce,
        hash: hashHex,
        hashesComputed: hashesComputed,
      });
      return; // Stop mining after finding solution
    }

    // Report progress periodically
    if (hashesComputed % REPORT_INTERVAL === 0) {
      self.postMessage({
        type: 'PROGRESS',
        hashesComputed: hashesComputed,
        currentHash: hashHex,
        nonce: nonce,
      });
    }

    nonce++;
  }
};
