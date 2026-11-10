const palettes: string[][] = [
  ["#0d0718", "#5b3bff", "#ff5f9e", "#8f7bff"],
  ["#041014", "#0e7490", "#5eead4", "#22d3ee"],
  ["#180a06", "#c2410c", "#f59e0b", "#fb7185"],
  ["#0a120c", "#166534", "#4ade80", "#a3e635"],
  ["#120714", "#9d174d", "#f472b6", "#c084fc"],
  ["#0b0f1a", "#1d4ed8", "#60a5fa", "#a5b4fc"],
  ["#140f07", "#a16207", "#facc15", "#fde68a"],
  ["#0a0a0f", "#334155", "#94a3b8", "#e2e8f0"],
  ["#100a14", "#6b21a8", "#c084fc", "#f0abfc"],
  ["#04120f", "#047857", "#34d399", "#a7f3d0"],
];

function hash(seed: number, salt = 7) {
  return Math.abs(Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453) % 1;
}

/** Deterministic, self-contained abstract cover art (no external assets). */
export function coverUrl(seed: number): string {
  const p = palettes[Math.abs(seed) % palettes.length];
  const x1 = 20 + hash(seed, 1) * 55;
  const y1 = 15 + hash(seed, 2) * 50;
  const x2 = 30 + hash(seed, 3) * 55;
  const y2 = 40 + hash(seed, 4) * 50;
  const r1 = 110 + hash(seed, 5) * 90;
  const r2 = 90 + hash(seed, 6) * 110;
  const variant = Math.abs(seed) % 4;
  const rot = Math.round(hash(seed, 8) * 90 - 45);

  let pattern = "";
  if (variant === 0) {
    pattern = `<g fill="none" stroke="${p[3]}" stroke-opacity=".22">
      <circle cx="200" cy="200" r="70"/><circle cx="200" cy="200" r="110"/>
      <circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="190"/>
    </g>`;
  } else if (variant === 1) {
    pattern = `<g stroke="${p[3]}" stroke-opacity=".18">
      ${Array.from({ length: 14 })
        .map((_, i) => `<line x1="${i * 32}" y1="0" x2="${i * 32}" y2="400"/>`)
        .join("")}
    </g>`;
  } else if (variant === 2) {
    pattern = `<g fill="${p[3]}" fill-opacity=".16">
      ${Array.from({ length: 9 })
        .map(
          (_, i) =>
            `<rect x="${20 + i * 42}" y="${300 - i * 18}" width="10" height="${60 + i * 22}" rx="5"/>`,
        )
        .join("")}
    </g>`;
  } else {
    pattern = `<g fill="${p[3]}" fill-opacity=".18">
      ${Array.from({ length: 26 })
        .map((_, i) => {
          const cx = 30 + hash(seed + i, 11) * 340;
          const cy = 30 + hash(seed + i, 12) * 340;
          return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(2 + hash(seed + i, 13) * 7).toFixed(1)}"/>`;
        })
        .join("")}
    </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p[0]}"/>
        <stop offset=".55" stop-color="${p[1]}" stop-opacity=".85"/>
        <stop offset="1" stop-color="${p[0]}"/>
      </linearGradient>
      <radialGradient id="a" cx="${x1}%" cy="${y1}%" r="70%">
        <stop offset="0" stop-color="${p[2]}" stop-opacity=".95"/>
        <stop offset="1" stop-color="${p[2]}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="b" cx="${x2}%" cy="${y2}%" r="70%">
        <stop offset="0" stop-color="${p[3]}" stop-opacity=".8"/>
        <stop offset="1" stop-color="${p[1]}" stop-opacity="0"/>
      </radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
    </defs>
    <rect width="400" height="400" fill="url(#g)"/>
    <g filter="url(#blur)">
      <circle cx="${(x1 / 100) * 400}" cy="${(y1 / 100) * 400}" r="${r1}" fill="${p[2]}" opacity=".55"/>
      <circle cx="${(x2 / 100) * 400}" cy="${(y2 / 100) * 400}" r="${r2}" fill="${p[1]}" opacity=".65"/>
    </g>
    <rect width="400" height="400" fill="url(#a)" opacity=".7"/>
    <rect width="400" height="400" fill="url(#b)" opacity=".5"/>
    <g transform="rotate(${rot} 200 200)">${pattern}</g>
    <rect width="400" height="400" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="2"/>
  </svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function coverStyle(seed: number, size?: number) {
  return {
    backgroundImage: coverUrl(seed),
    backgroundSize: "cover",
    backgroundPosition: "center",
    ...(size ? { width: size, height: size } : {}),
  } as const;
}
