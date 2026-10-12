/**
 * Optional audio, synthesized with the Web Audio API.
 *
 * There are no audio files in this build, so there is nothing to 404 on and no
 * licensing question to answer. Every call is guarded: if AudioContext is
 * missing, blocked, or the player has muted, the call is a silent no-op and the
 * game plays exactly the same.
 *
 * The context is created lazily on the first sound triggered by gameplay,
 * which only happens after the player has interacted with the page, so
 * browser autoplay policies are satisfied without a special unlock step.
 */

/**
 * @typedef {Object} AudioSettings
 * @property {number} master 0-100
 * @property {number} sfx    0-100
 * @property {number} music  0-100
 * @property {boolean} mute
 */

export function createAudio(getSettings) {
  /** @type {AudioContext|null} */
  let context = null;
  let failed = false;

  /** Resolve the effective sfx gain, 0 when silent. */
  function gainFor(base) {
    const s = getSettings() || {};
    if (s.mute) return 0;
    const master = Number.isFinite(s.master) ? s.master : 0;
    const sfx = Number.isFinite(s.sfx) ? s.sfx : 0;
    return (base * (master / 100) * (sfx / 100)) || 0;
  }

  function ensureContext() {
    if (failed) return null;
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        failed = true;
        return null;
      }
      context = new Ctor();
      return context;
    } catch {
      failed = true;
      return null;
    }
  }

  return {
    /**
     * Play a short synthesized blip.
     * @param {number} freq      Frequency in Hz.
     * @param {number} duration  Length in seconds.
     * @param {{type?: OscillatorType, volume?: number, sweepTo?: number}} [opts]
     */
    play(freq, duration, opts = {}) {
      const volume = gainFor(opts.volume ?? 0.05);
      if (volume <= 0) return;

      const ctx = ensureContext();
      if (!ctx) return;

      try {
        // Autoplay policy: the context may start suspended until a gesture.
        if (ctx.state === "suspended") ctx.resume().catch(() => {});

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = opts.type || "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        if (opts.sweepTo) {
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(1, opts.sweepTo),
            ctx.currentTime + duration,
          );
        }

        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        /* Audio is a nicety, never a requirement. */
      }
    },

    /** Named cues, so the scene never hardcodes frequencies. */
    core() {
      this.play(700, 0.07, { type: "triangle" });
    },
    allCores() {
      this.play(520, 0.18, { type: "triangle", sweepTo: 1040, volume: 0.06 });
    },
    damage() {
      this.play(150, 0.15, { type: "sawtooth", volume: 0.06 });
    },
    ability() {
      this.play(420, 0.15, { type: "square", sweepTo: 760, volume: 0.04 });
    },
    locked() {
      this.play(180, 0.1, { type: "square", volume: 0.03 });
    },
    win() {
      [523, 659, 784].forEach((f, i) =>
        setTimeout(() => this.play(f, 0.18, { type: "triangle", volume: 0.05 }), i * 110),
      );
    },
    lose() {
      [330, 247].forEach((f, i) =>
        setTimeout(() => this.play(f, 0.28, { type: "sawtooth", volume: 0.05 }), i * 160),
      );
    },

    /** Release the context on scene shutdown. */
    destroy() {
      if (!context) return;
      const closing = context;
      context = null;
      try {
        closing.close().catch(() => {});
      } catch {
        /* Already closed. */
      }
    },
  };
}
