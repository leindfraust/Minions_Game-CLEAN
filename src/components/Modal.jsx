"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

/** Elements that can hold focus inside a dialog. */
const FOCUSABLE =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog.
 *
 * - `role="dialog"` with `aria-modal` and a label.
 * - Focus moves into the dialog on open and returns to the trigger on close.
 * - Tab and Shift+Tab are trapped inside.
 * - Escape and backdrop clicks close it.
 * - Background scrolling is locked while open, then restored.
 *
 * Rendered through a portal to document.body so no ancestor's `overflow` or
 * `transform` can clip or mis-position it.
 *
 * `closeOnEscape` exists for the pause dialog: the running scene already owns
 * the Escape key as its pause toggle, so if this dialog also closed on Escape
 * the key would be handled twice and the two toggles would cancel out.
 *
 * @param {{title: string, onClose: () => void, children: React.ReactNode, wide?: boolean, closeOnEscape?: boolean}} props
 */
export default function Modal({
  title,
  onClose,
  children,
  wide = false,
  closeOnEscape = true,
}) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        if (!closeOnEscape) return;
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = dialogRef.current?.querySelectorAll(FOCUSABLE);
      if (!items || items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose, closeOnEscape],
  );

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;

    // Focus the dialog itself, so a screen reader announces the label before
    // the first control rather than jumping straight into the content.
    dialogRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
      // Return focus to whatever opened the dialog, if it is still around.
      const target = restoreFocusRef.current;
      if (target instanceof HTMLElement && document.contains(target)) {
        target.focus();
      }
    };
  }, []);

  // Portals need a DOM target, which only exists on the client. Modals are
  // always opened by an interaction, so there is nothing to render on first
  // paint anyway.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      // A click that starts and ends on the backdrop closes; a drag from
      // inside the dialog onto the backdrop does not.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${styles.modal} ${wide ? styles.wide : ""}`}
        onKeyDown={handleKeyDown}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close dialog">
          &times;
        </button>
        <h2 className={styles.title}>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export { styles as modalStyles };
