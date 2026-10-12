import styles from "./Logo.module.css";

/**
 * The wordmark. Pure presentation, safe to render on the server.
 * @param {{large?: boolean}} props
 */
export default function Logo({ large = false }) {
  return (
    <div className={`${styles.logo} ${large ? styles.large : ""}`}>
      <span className={styles.icon} aria-hidden="true">
        m<span>&#10038;</span>
      </span>
      <span className={styles.wordmark}>
        MOTE MAYHEM
        <small>LAB ESCAPE</small>
      </span>
    </div>
  );
}
