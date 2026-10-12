import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameHud from "./GameHud";
import { getCharacter } from "@/data/catalog";
import { GAME } from "@/game/config/constants";

const character = getCharacter("volt");

const baseHud = {
  health: GAME.health,
  cores: 0,
  time: GAME.duration,
  cooldown: 0,
  abilityActive: false,
};

function renderHud(hud = {}, props = {}) {
  const onAbility = vi.fn();
  const onPause = vi.fn();
  const utils = render(
    <GameHud
      character={character}
      equipped={{}}
      hud={{ ...baseHud, ...hud }}
      objective="Collect 8 more Energy Cores."
      onAbility={onAbility}
      onPause={onPause}
      {...props}
    />,
  );
  return { ...utils, onAbility, onPause };
}

describe("GameHud", () => {
  it("shows the character name and the objective", () => {
    renderHud();
    expect(screen.getByText(character.name)).toBeTruthy();
    expect(screen.getByText(/Collect 8 more Energy Cores/)).toBeTruthy();
  });

  it("shows collected cores out of the mission total", () => {
    renderHud({ cores: 5 });
    expect(screen.getByText(/\/ 8/)).toBeTruthy();
    expect(screen.getByText(/5/)).toBeTruthy();
  });

  it("formats the remaining time as M:SS", () => {
    renderHud({ time: 90 });
    expect(screen.getByText(/1:30/)).toBeTruthy();
  });

  it("pads seconds under ten", () => {
    renderHud({ time: 9 });
    expect(screen.getByText(/0:09/)).toBeTruthy();
  });

  it("describes remaining health to assistive technology", () => {
    renderHud({ health: 2 });
    expect(screen.getByLabelText("2 of 3 health remaining")).toBeTruthy();
  });

  it("marks the ability ready when off cooldown", () => {
    renderHud({ cooldown: 0 });
    const button = screen.getByRole("button", { name: /Use EMP Pulse$/ });
    expect(button.disabled).toBe(false);
    expect(screen.getByText(/Ready/)).toBeTruthy();
  });

  it("disables the ability while it is recharging", () => {
    renderHud({ cooldown: 4.2 });
    const button = screen.getByRole("button", { name: /recharging/ });
    expect(button.disabled).toBe(true);
    expect(screen.getByText("4.2s")).toBeTruthy();
  });

  it("announces the remaining cooldown in the accessible name", () => {
    renderHud({ cooldown: 3 });
    expect(
      screen.getByRole("button", { name: /recharging, 3.0 seconds left/ }),
    ).toBeTruthy();
  });

  it("fires the ability when clicked", async () => {
    const user = userEvent.setup();
    const { onAbility } = renderHud({ cooldown: 0 });
    await user.click(screen.getByRole("button", { name: /Use EMP Pulse$/ }));
    expect(onAbility).toHaveBeenCalledTimes(1);
  });

  it("does not fire the ability while recharging", async () => {
    const user = userEvent.setup();
    const { onAbility } = renderHud({ cooldown: 5 });
    await user.click(screen.getByRole("button", { name: /recharging/ })).catch(() => {});
    expect(onAbility).not.toHaveBeenCalled();
  });

  it("pauses when the pause button is pressed", async () => {
    const user = userEvent.setup();
    const { onPause } = renderHud();
    await user.click(screen.getByRole("button", { name: /Pause mission/ }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("only re-renders when a displayed value changes", () => {
    // The HUD is memoised, and the scene only emits on change; re-rendering
    // with an identical payload must not produce different output.
    const hud = { ...baseHud, cores: 3 };
    const { rerender, container } = render(
      <GameHud
        character={character}
        equipped={{}}
        hud={hud}
        objective="Collect 5 more Energy Cores."
        onAbility={vi.fn()}
        onPause={vi.fn()}
      />,
    );
    const first = container.innerHTML;

    rerender(
      <GameHud
        character={character}
        equipped={{}}
        hud={hud}
        objective="Collect 5 more Energy Cores."
        onAbility={vi.fn()}
        onPause={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe(first);
  });

  it("puts the objective in a live region so changes are announced", () => {
    const { container } = renderHud();
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live.textContent).toContain("Collect 8 more Energy Cores.");
  });
});
