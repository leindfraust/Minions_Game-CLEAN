// Keeps unit tests deterministic: every test starts from clean storage and
// no test inherits a stubbed global from the previous file.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    /* Storage may be stubbed or blocked by an individual test. */
  }
});
