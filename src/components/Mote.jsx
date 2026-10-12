/**
 * Original Mote illustration.
 *
 * Every Mote is hand-authored inline SVG: distinct silhouette, expressive
 * face behind a digital visor, unusual limbs and its own outfit details. No
 * external image service, no bitmap assets, and it scales to any size.
 *
 * Equipped cosmetics are drawn here too, so the crew screen, the inventory
 * fitting room and the results screen all show the same outfit the player
 * will see on the canvas.
 */

import styles from "./Mote.module.css";
import { getCosmetic } from "@/data/catalog";

/** Per-Mote body silhouettes. Each one is a different creature, not a recolour. */
const SILHOUETTES = {
  // Volt: a tall, slightly hunched engineer capsule.
  volt: "M65 104 Q65 55 119 55 Q177 55 178 105 L183 185 Q184 222 148 226 L93 226 Q57 224 58 188 Z",
  // Pip: a wedge, built for running.
  pip: "M115 48 Q131 41 146 67 L182 181 Q189 213 159 221 L82 221 Q52 213 61 182 L91 74 Q97 56 115 48",
  // Glitch: an unstable faceted diamond.
  glitch:
    "M119 48 Q132 44 142 61 L188 132 Q202 152 186 174 L148 219 Q122 239 99 220 L55 170 Q41 151 54 131 L95 66 Q104 48 119 48",
  // Moss: a wide, heavy slab.
  moss: "M66 78 Q64 58 86 57 L157 57 Q181 57 181 79 L190 190 Q194 222 167 225 L79 225 Q47 224 51 194 Z",
};

/**
 * @param {Object} props
 * @param {import('@/data/catalog').Character} props.character
 * @param {"" | "moving" | "casting"} [props.pose]
 * @param {Record<string, string>} [props.equipped]
 * @param {string} [props.className]
 * @param {boolean} [props.decorative] Hide from assistive tech when duplicated by a label.
 */
export default function Mote({
  character,
  pose = "",
  equipped = {},
  className = "",
  decorative = false,
}) {
  const bodyCosmetic = getCosmetic(equipped["Body colors"]);
  const color = bodyCosmetic?.color || character.color;

  const visor = getCosmetic(equipped.Visors);
  const back = getCosmetic(equipped["Back accessories"]);
  const boots = getCosmetic(equipped.Footwear);

  // Gradient ids must be unique per Mote so two on one page cannot collide.
  const bodyId = `mote-body-${character.id}`;
  const glassId = `mote-glass-${character.id}`;

  const poseClass = pose === "moving" ? styles.moving : pose === "casting" ? styles.casting : "";

  return (
    <svg
      className={`${styles.mote} ${styles[character.id] || ""} ${poseClass} ${className}`}
      viewBox="0 0 240 270"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${character.name}, the ${character.role}`}
    >
      <defs>
        <linearGradient id={bodyId} x2=".8" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".65" />
        </linearGradient>
        <linearGradient id={glassId} x2="0" y2="1">
          <stop stopColor="#263e56" />
          <stop offset="1" stopColor="#101d30" />
        </linearGradient>
      </defs>

      {/* Contact shadow, outside the animated group so it stays put. */}
      <ellipse cx="120" cy="243" rx="69" ry="12" fill="#050c18" opacity=".4" />

      <g className={styles.body}>
        {/* Unusual limbs: thin, rubbery arms that do not match the body. */}
        <g stroke={color} strokeWidth="13" strokeLinecap="round">
          <path d="M66 149 Q35 155 40 187" />
          <path d="M177 148 Q204 150 200 174" />
        </g>

        {/* Two stubby legs. */}
        <g fill="#243343" stroke="#111e30" strokeWidth="5">
          <path d="M83 210 L78 235 Q87 249 103 236 L104 209" />
          <path d="M136 210 L138 237 Q156 248 163 234 L158 208" />
        </g>

        {boots && (
          <g fill={boots.color}>
            <rect x="71" y="229" width="37" height="15" rx="7" />
            <rect x="135" y="229" width="37" height="15" rx="7" />
          </g>
        )}

        {/* Body. */}
        <path
          d={SILHOUETTES[character.id] || SILHOUETTES.volt}
          fill={`url(#${bodyId})`}
          stroke={color}
          strokeWidth="3"
        />

        {/* Specular highlight for the glossy sci-fi cartoon look. */}
        <path
          d="M83 77 Q101 63 126 65"
          stroke="white"
          strokeWidth="5"
          opacity=".25"
          fill="none"
          strokeLinecap="round"
        />

        {/* Digital visor housing. */}
        <rect
          x="62"
          y="99"
          width="119"
          height="65"
          rx={character.id === "moss" ? 18 : 27}
          fill="#131e30"
          stroke="#3d556c"
          strokeWidth="6"
        />
        <rect x="69" y="105" width="105" height="50" rx="21" fill={`url(#${glassId})`} />

        {/* Expressive face behind the glass. */}
        <g className={styles.eyes} stroke="#b0fcff" strokeWidth="8" strokeLinecap="round">
          <path d="M94 125 v8 M146 125 v8" />
        </g>
        <path d="M110 146 Q120 151 130 144" fill="none" stroke="#75e8f0" strokeWidth="2" />
        <path
          d="M111 180 q10 8 20 0"
          fill="none"
          stroke="#182b3b"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Per-Mote outfit and headgear. */}
        {character.id === "volt" && (
          <g>
            <path d="M120 54 V28 L134 21" fill="none" stroke="#86dbef" strokeWidth="6" />
            <circle cx="138" cy="20" r="7" fill="#d1fcad" />
            <path d="M84 201 h72" stroke="#34495e" strokeWidth="14" />
            <rect x="110" y="191" width="23" height="22" rx="4" fill="#d9e978" />
            <path d="m122 194 -6 9 h8 l-5 8" stroke="#34495e" fill="none" strokeWidth="2" />
          </g>
        )}

        {character.id === "pip" && (
          <g>
            <path d="M104 61 86 31 120 48 144 29 139 60" fill="#ffbc83" />
            <path d="m64 179 113 26" stroke="#5b4953" strokeWidth="12" />
            <rect x="100" y="187" width="28" height="22" rx="5" fill="#f3cd9b" />
          </g>
        )}

        {character.id === "glitch" && (
          <g>
            <path d="m72 89 -13 -22 30 10 M157 79 l26 -13 -9 30" fill="#dbc4ff" />
            <path
              d="m104 198 17 -13 17 13 -17 14Z"
              fill="#7257b3"
              stroke="#e6bfff"
              strokeWidth="2"
            />
          </g>
        )}

        {character.id === "moss" && (
          <g>
            <path d="M105 58 Q80 14 121 42 Q146 8 147 40 L126 60" fill="#7bb77b" />
            <rect x="63" y="186" width="117" height="32" rx="10" fill="#49675c" />
            <rect x="87" y="188" width="26" height="24" rx="6" fill="#a8c890" />
            <path d="M156 169 v14 m-7 -7 h14" stroke="#edffd2" strokeWidth="4" />
          </g>
        )}

        {/* Equipped cosmetics. */}
        {back && (
          <path d="M176 90 V38 l17 -12" stroke={back.color} strokeWidth="5" fill="none" />
        )}
        {visor && <path d="M78 111 h86" stroke={visor.color} strokeWidth="5" />}
      </g>
    </svg>
  );
}
