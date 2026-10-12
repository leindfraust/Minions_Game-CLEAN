/**
 * Placeholder for future Web3 integration.
 *
 * Nothing here touches a wallet, a chain, or a signer. It exists so the UI can
 * render honest "coming soon" states today and so a real integration has one
 * obvious place to land tomorrow.
 *
 * A real implementation would replace `connect`/`disconnect` with an injected
 * provider (EIP-1193) or a wallet SDK, keep the same return shape, and leave
 * every consumer unchanged.
 */

/** Connection states the future UI needs to handle. */
export const WALLET_STATES = [
  "disconnected",
  "connecting",
  "connected",
  "wrong-network",
  "error",
];

/** Human-readable copy for each state, used by the demo modal. */
export const WALLET_STATE_COPY = {
  disconnected: "No wallet required. The game is fully playable without one.",
  connecting: "A real build would show a provider prompt here.",
  connected: "A real build would show the connected address and network.",
  "wrong-network": "A real build would offer to switch networks.",
  error: "A real build would explain the failure and offer a retry.",
};

/**
 * Describe a wallet state without connecting to anything.
 * @param {string} [state]
 */
export function getProfile(state = "disconnected") {
  return {
    state,
    address: state === "connected" ? "0xDEMO…0000" : null,
    network: "Prototype network",
    /** Always true in this build. Consumers must surface this to the player. */
    isMock: true,
  };
}

/**
 * Intentionally unimplemented. Kept so the integration point is visible and
 * so no caller can accidentally believe a connection happened.
 * @returns {Promise<never>}
 */
export function connect() {
  return Promise.reject(
    new Error("Wallet connection is not implemented in this frontend build."),
  );
}

export function disconnect() {
  return Promise.resolve(getProfile("disconnected"));
}

/**
 * Future cosmetic-ownership check. Today every cosmetic is local, so this
 * always reports local ownership and never a token.
 * @param {{id: string, locked: boolean}} cosmetic
 */
export function describeOwnership(cosmetic) {
  return {
    id: cosmetic.id,
    owned: !cosmetic.locked,
    onChain: false,
    note: "Local cosmetic. Token-backed ownership is not implemented.",
  };
}

export const walletService = {
  states: WALLET_STATES,
  getProfile,
  connect,
  disconnect,
  describeOwnership,
};
