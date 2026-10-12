import { describe, it, expect, vi } from "vitest";
import { createBridge } from "./bridge";

describe("createBridge", () => {
  it("delivers an emitted payload to a listener", () => {
    const bridge = createBridge();
    const handler = vi.fn();
    bridge.on("hud", handler);

    bridge.emit("hud", { cores: 3 });

    expect(handler).toHaveBeenCalledWith({ cores: 3 });
  });

  it("delivers to every listener on the same event", () => {
    const bridge = createBridge();
    const a = vi.fn();
    const b = vi.fn();
    bridge.on("hud", a);
    bridge.on("hud", b);

    bridge.emit("hud", 1);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("does not cross events", () => {
    const bridge = createBridge();
    const hud = vi.fn();
    bridge.on("hud", hud);

    bridge.emit("objective", "something else");

    expect(hud).not.toHaveBeenCalled();
  });

  it("stops delivering after the returned unsubscribe runs", () => {
    const bridge = createBridge();
    const handler = vi.fn();
    const off = bridge.on("hud", handler);

    bridge.emit("hud", 1);
    off();
    bridge.emit("hud", 2);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("tolerates unsubscribing twice", () => {
    const bridge = createBridge();
    const off = bridge.on("hud", vi.fn());
    off();
    expect(() => off()).not.toThrow();
  });

  it("drops every listener on destroy, so a remount cannot leak them", () => {
    const bridge = createBridge();
    const hud = vi.fn();
    const objective = vi.fn();
    bridge.on("hud", hud);
    bridge.on("objective", objective);

    bridge.destroy();
    bridge.emit("hud", 1);
    bridge.emit("objective", "x");

    expect(hud).not.toHaveBeenCalled();
    expect(objective).not.toHaveBeenCalled();
  });

  it("keeps two bridges completely independent", () => {
    // Each mission gets its own bridge; one must never hear the other's events.
    const first = createBridge();
    const second = createBridge();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    first.on("hud", firstHandler);
    second.on("hud", secondHandler);

    first.emit("hud", "only first");

    expect(firstHandler).toHaveBeenCalledWith("only first");
    expect(secondHandler).not.toHaveBeenCalled();
  });

  it("emits with no payload without throwing", () => {
    const bridge = createBridge();
    const handler = vi.fn();
    bridge.on("game-started", handler);

    bridge.emit("game-started");

    expect(handler).toHaveBeenCalledWith(null);
  });

  it("carries commands from React to the scene", () => {
    const bridge = createBridge();
    const commands = [];
    bridge.on("command", (c) => commands.push(c));

    ["pause", "resume", "ability", "interact"].forEach((c) => bridge.emit("command", c));

    expect(commands).toEqual(["pause", "resume", "ability", "interact"]);
  });
});
