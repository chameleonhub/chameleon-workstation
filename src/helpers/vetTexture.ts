// Sparse, faint veterinary artwork - rounded icon tiles (stethoscope, heartbeat, bandage, cross,
// thermometer), loose medical shapes (bone, capsule, heart, drop, ring, plus) and cattle, cat and dog
// footprints - scattered at random positions, sizes and rotations over a large SVG canvas and returned as
// a CSS `url(...)` for `backgroundImage`. The scatter is seeded (see `mulberry32`), so it's the same on
// every run rather than reshuffling on each reload, but random enough that - unlike a small hand-arranged
// tile - the same handful of large shapes never lands in the same spot on every repeat of the background,
// which is what made the tiling obvious before.
//
// `color` is the shapes' colour: white on the sign-in brand panel's gradient, the theme's primary colour on
// the light app pages. The opacities are baked in and tuned to stay quiet in both cases; fade a whole layer
// further with CSS opacity.
const cache = new Map<string, string>();

const CANVAS_WIDTH = 840;
const CANVAS_HEIGHT = 1120;
const CELL_SIZE = 140;
const FILL_CHANCE = 0.62;

const TILE_FILL = 0.037;
const TILE_STROKE = 0.066;
const GLYPH = 0.1;
const LOOSE = 0.07;

// A small seeded PRNG (mulberry32) - deterministic (same seed -> same output every run), so the
// scatter below doesn't change between reloads or between the two colours it's built in.
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const at = (x: number, y: number, rotate = 0, scale = 1) =>
    `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)})${scale === 1 ? '' : ` scale(${scale.toFixed(2)})`}`;

const buildSvg = (color: string) => {
    const fill = (opacity: number) => `fill="${color}" fill-opacity="${opacity}"`;
    const stroke = (opacity: number, width: number) =>
        `fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

    // rounded square with a soft drop shadow, holding an icon drawn around (0, 0)
    const tile = (x: number, y: number, size: number, rotate: number, icon: string) =>
        `<g transform="${at(x, y, rotate)}" filter="url(#lift)">` +
        `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.26}" ${fill(TILE_FILL)} stroke="${color}" stroke-opacity="${TILE_STROKE}"/>` +
        `<g transform="scale(${Math.min(1, size / 56).toFixed(2)})" ${fill(GLYPH)}>${icon}</g></g>`;

    const plus = (x: number, y: number, size: number, rotate: number) => {
        const t = size * 0.28;
        return (
            `<g transform="${at(x, y, rotate)}" ${fill(LOOSE * 1.2)}>` +
            `<rect x="${-t / 2}" y="${-size / 2}" width="${t}" height="${size}" rx="${t / 2}"/>` +
            `<rect x="${-size / 2}" y="${-t / 2}" width="${size}" height="${t}" rx="${t / 2}"/></g>`
        );
    };
    const heart = (x: number, y: number, rotate: number, scale: number) =>
        `<path transform="${at(x, y, rotate, scale)}" d="M0 8C-16 -4 -8 -16 0 -6C8 -16 16 -4 0 8Z" ${fill(LOOSE)}/>`;
    const drop = (x: number, y: number, rotate: number, scale: number) =>
        `<path transform="${at(x, y, rotate, scale)}" d="M0 -12C7 -3 10 2 10 6a10 10 0 0 1-20 0C-10 2-7 -3 0 -12Z" ${fill(LOOSE)}/>`;
    const ring = (x: number, y: number, scale: number) =>
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(7 * scale).toFixed(1)}" ${stroke(LOOSE * 1.05, 3)}/>`;

    // --- icons that live inside tiles ---
    const ecg = `<polyline points="-15,0 -7,0 -3,-11 3,11 8,0 15,0" ${stroke(GLYPH * 1.25, 3.6)}/>`;
    const bandage =
        `<g transform="rotate(45)"><rect x="-26" y="-9" width="52" height="18" rx="9"/>` +
        `<rect x="-8" y="-9" width="16" height="18" fill-opacity="${GLYPH * 0.5}"/></g>`;
    const cross = `<rect x="-6" y="-19" width="12" height="38" rx="3"/><rect x="-19" y="-6" width="38" height="12" rx="3"/>`;
    const stethoscope =
        `<path d="M-10 -14v9a10 10 0 0 0 20 0v-9" ${stroke(GLYPH * 1.3, 3)}/>` +
        `<path d="M0 5v6a7 7 0 0 0 14 0v-4" ${stroke(GLYPH * 1.3, 3)}/>` +
        `<circle cx="-10" cy="-15" r="2.6"/><circle cx="10" cy="-15" r="2.6"/><circle cx="14" cy="5" r="4.2"/>`;
    const thermometer =
        `<g transform="rotate(35)"><rect x="-3.5" y="-19" width="7" height="27" rx="3.5"/><circle cx="0" cy="11" r="7"/>` +
        `<rect x="7" y="-13" width="7" height="2" rx="1"/><rect x="7" y="-7" width="7" height="2" rx="1"/><rect x="7" y="-1" width="7" height="2" rx="1"/></g>`;
    const icons = [stethoscope, ecg, bandage, cross, thermometer];

    // --- loose shapes ---
    const bone = (x: number, y: number, rotate: number, scale: number) =>
        `<g transform="${at(x, y, rotate, scale)}" ${fill(LOOSE)}><rect x="-20" y="-3.5" width="40" height="7" rx="3.5"/>` +
        `<circle cx="-20" cy="-4.5" r="5"/><circle cx="-20" cy="4.5" r="5"/><circle cx="20" cy="-4.5" r="5"/><circle cx="20" cy="4.5" r="5"/></g>`;
    const capsule = (x: number, y: number, rotate: number, scale: number) =>
        `<g transform="${at(x, y, rotate, scale)}"><path d="M0 -8h-14a8 8 0 0 0 0 16h14z" ${fill(LOOSE * 1.3)}/>` +
        `<path d="M0 -8h14a8 8 0 0 1 0 16h-14z" ${fill(LOOSE * 0.7)}/></g>`;

    // --- animal footprints ---
    const dogPaw = (x: number, y: number, rotate: number, scale: number) =>
        `<g transform="${at(x, y, rotate, scale)}" ${fill(LOOSE)}><ellipse cx="0" cy="9" rx="12" ry="9.5"/>` +
        `<ellipse cx="-13" cy="-4" rx="4.5" ry="6.5" transform="rotate(-25 -13 -4)"/><ellipse cx="-4.5" cy="-11" rx="4.5" ry="6.5"/>` +
        `<ellipse cx="4.5" cy="-11" rx="4.5" ry="6.5"/><ellipse cx="13" cy="-4" rx="4.5" ry="6.5" transform="rotate(25 13 -4)"/></g>`;
    const catPaw = (x: number, y: number, rotate: number, scale: number) =>
        `<g transform="${at(x, y, rotate, scale)}" ${fill(LOOSE)}><ellipse cx="0" cy="7" rx="9" ry="7"/>` +
        `<circle cx="-11" cy="-4" r="4.2"/><circle cx="-4" cy="-11" r="4.2"/><circle cx="4" cy="-11" r="4.2"/><circle cx="11" cy="-4" r="4.2"/></g>`;
    const cattleHoof = (x: number, y: number, rotate: number, scale: number) =>
        `<g transform="${at(x, y, rotate, scale)}" ${fill(LOOSE)}>` +
        `<ellipse cx="-8" cy="0" rx="6.5" ry="14" transform="rotate(12 -8 0)"/><ellipse cx="8" cy="0" rx="6.5" ry="14" transform="rotate(-12 8 0)"/></g>`;
    const paws = [dogPaw, catPaw, cattleHoof];

    const rng = mulberry32(0xba415);
    const range = (min: number, max: number) => min + rng() * (max - min);
    const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

    const cols = Math.round(CANVAS_WIDTH / CELL_SIZE);
    const rows = Math.round(CANVAS_HEIGHT / CELL_SIZE);
    const shapes: string[] = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (rng() > FILL_CHANCE) continue;

            const cx = col * CELL_SIZE + CELL_SIZE / 2 + range(-0.3, 0.3) * CELL_SIZE;
            const cy = row * CELL_SIZE + CELL_SIZE / 2 + range(-0.3, 0.3) * CELL_SIZE;
            // Weighted so icon tiles (the largest, most eye-catching shapes) are rarer than the small
            // loose shapes and footprints - keeps the scatter feeling sparse rather than crowded.
            const kind = pick(['tile', 'tile', 'loose', 'loose', 'loose', 'paw']);

            if (kind === 'tile') {
                shapes.push(tile(cx, cy, range(44, 100), range(-18, 18), pick(icons)));
            } else if (kind === 'paw') {
                shapes.push(pick(paws)(cx, cy, range(0, 360), range(0.6, 1.5)));
            } else {
                const loose = pick(['bone', 'capsule', 'heart', 'drop', 'ring', 'plus']);
                if (loose === 'bone') shapes.push(bone(cx, cy, range(0, 360), range(0.7, 1.3)));
                else if (loose === 'capsule') shapes.push(capsule(cx, cy, range(0, 360), range(0.7, 1.3)));
                else if (loose === 'heart') shapes.push(heart(cx, cy, range(0, 360), range(0.6, 1.2)));
                else if (loose === 'drop') shapes.push(drop(cx, cy, range(0, 360), range(0.6, 1.2)));
                else if (loose === 'ring') shapes.push(ring(cx, cy, range(0.7, 1.6)));
                else shapes.push(plus(cx, cy, range(14, 32), range(0, 90)));
            }
        }
    }

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">` +
        `<defs><filter id="lift" x="-40%" y="-40%" width="180%" height="180%">` +
        `<feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity="0.066"/></filter></defs>` +
        shapes.join('') +
        `</svg>`
    );
};

export const vetTexture = (color: string): string => {
    let texture = cache.get(color);
    if (!texture) {
        texture = `url("data:image/svg+xml,${encodeURIComponent(buildSvg(color))}")`;
        cache.set(color, texture);
    }
    return texture;
};

export const VET_TEXTURE_TILE_SIZE = `${CANVAS_WIDTH}px ${CANVAS_HEIGHT}px`;
