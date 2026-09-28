// Sparse, faint veterinary artwork - rounded icon tiles (stethoscope, heartbeat, bandage, cross,
// thermometer), a bone, a capsule, a few small accents (plus, heart, drop, ring) and cattle, cat and dog footprints - drawn as a 420x560 SVG
// tile and returned as a CSS `url(...)` for `backgroundImage`.
//
// `color` is the shapes' colour: white on the sign-in brand panel's gradient, the theme's primary colour on
// the light app pages. The opacities are baked in and tuned to stay quiet in both cases; fade a whole layer
// further with CSS opacity.
const cache = new Map<string, string>();

const TILE_FILL = 0.037;
const TILE_STROKE = 0.066;
const GLYPH = 0.1;
const LOOSE = 0.07;

const at = (x: number, y: number, rotate = 0, scale = 1) =>
    `translate(${x} ${y}) rotate(${rotate})${scale === 1 ? '' : ` scale(${scale})`}`;

const buildSvg = (color: string) => {
    const fill = (opacity: number) => `fill="${color}" fill-opacity="${opacity}"`;
    const stroke = (opacity: number, width: number) =>
        `fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

    // rounded square with a soft drop shadow, holding an icon drawn around (0, 0)
    const tile = (x: number, y: number, size: number, rotate: number, icon: string) =>
        `<g transform="${at(x, y, rotate)}" filter="url(#lift)">` +
        `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.26}" ${fill(TILE_FILL)} stroke="${color}" stroke-opacity="${TILE_STROKE}"/>` +
        `<g transform="scale(${Math.min(1, size / 56)})" ${fill(GLYPH)}>${icon}</g></g>`;

    const plus = (x: number, y: number, size: number, rotate: number, opacity: number) => {
        const t = size * 0.28;
        return (
            `<g transform="${at(x, y, rotate)}" ${fill(opacity)}>` +
            `<rect x="${-t / 2}" y="${-size / 2}" width="${t}" height="${size}" rx="${t / 2}"/>` +
            `<rect x="${-size / 2}" y="${-t / 2}" width="${size}" height="${t}" rx="${t / 2}"/></g>`
        );
    };
    const heart = (x: number, y: number, rotate: number, scale: number) =>
        `<path transform="${at(x, y, rotate, scale)}" d="M0 8C-16 -4 -8 -16 0 -6C8 -16 16 -4 0 8Z" ${fill(LOOSE)}/>`;
    const drop = (x: number, y: number, rotate: number, scale: number) =>
        `<path transform="${at(x, y, rotate, scale)}" d="M0 -12C7 -3 10 2 10 6a10 10 0 0 1-20 0C-10 2-7 -3 0 -12Z" ${fill(LOOSE)}/>`;

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

    // --- loose shapes ---
    const bone = (x: number, y: number, rotate: number, opacity: number) =>
        `<g transform="${at(x, y, rotate)}" ${fill(opacity)}><rect x="-20" y="-3.5" width="40" height="7" rx="3.5"/>` +
        `<circle cx="-20" cy="-4.5" r="5"/><circle cx="-20" cy="4.5" r="5"/><circle cx="20" cy="-4.5" r="5"/><circle cx="20" cy="4.5" r="5"/></g>`;
    const capsule = (x: number, y: number, rotate: number) =>
        `<g transform="${at(x, y, rotate)}"><path d="M0 -8h-14a8 8 0 0 0 0 16h14z" ${fill(LOOSE * 1.3)}/>` +
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

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">` +
        `<defs><filter id="lift" x="-40%" y="-40%" width="180%" height="180%">` +
        `<feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity="0.066"/></filter></defs>` +
        // icon tiles: two large, two medium, one small
        tile(95, 65, 56, -8, stethoscope) +
        tile(355, 250, 100, -8, bandage) +
        tile(85, 385, 84, -10, cross) +
        tile(210, 482, 50, 10, thermometer) +
        tile(225, 160, 38, 8, ecg) +
        // loose medical shapes
        bone(70, 235, -30, LOOSE) +
        capsule(60, 505, 36) +
        // small accents
        plus(150, 150, 14, 10, LOOSE * 1.2) +
        plus(385, 360, 16, -8, LOOSE * 1.2) +
        heart(40, 130, -10, 0.8) +
        drop(395, 150, 0, 0.8) +
        `<circle cx="28" cy="300" r="7" ${stroke(LOOSE * 1.05, 3)}/>` +
        // animal footprints
        dogPaw(330, 62, 15, 1.3) +
        catPaw(185, 320, 16, 1.15) +
        cattleHoof(352, 505, 22, 1) +
        catPaw(140, 458, -14, 0.6) +
        cattleHoof(272, 262, 20, 0.55) +
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

export const VET_TEXTURE_TILE_SIZE = '420px 560px';
