// Shop thumbnails: renders every cosmetic of CraftCosmetics' cosmetics/index.json to public/cosmetics/<id>.png with
// CraftCosmetics' tools/preview_model.js (the same pose maths and lighting as the game, no Minecraft needed).
// Transparent 192 px squares, one camera per slot so a row of tiles reads as one set:
//   wings, back         3/4 from behind, on a dark stand-in player
//   cape                3/4 from behind, the cape alone (on the player its pattern would be too small to read)
//   head                3/4 from the front, on a stand-in bust (head and shoulders)
//   aura                3/4 from the front, on the stand-in player
//   pet                 3/4 from the front, alone
//   shield, mace, totem 3/4 of the item as held (preview_model's --held), alone
// Emotes are not rendered: the store does not sell them.
//
// Run from the launcher repo (plain node, no packages):
//   node tools/render_shop_thumbs.js [--src ../CraftCosmetics] [--only id,id] [--force] [--size 192] [--ss 4] [--time 0]
//     [--out public/cosmetics]
// Unchanged cosmetics (same source file, same settings) are skipped; --force renders all again. PNGs of ids that left
// the index are deleted. The process runs at below-normal priority and renders one cosmetic at a time.
//
// NEVER renders totem_picture_frame: the local CraftCosmetics working copy holds a private photo in that model, so the
// script does not even open the file and deletes a stray PNG of it. The shop shows its slot icon instead.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const NEVER = new Set(["totem_picture_frame"]);

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

// ---------------------------------------------------------------- options
const args = process.argv.slice(2);
const opt = {
  src: path.resolve(repo, "../CraftCosmetics"),
  out: path.join(repo, "public/cosmetics"),
  only: null,
  force: false,
  size: 192,
  ss: 4,
  time: 0,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--src") opt.src = path.resolve(args[++i]);
  else if (a === "--out") opt.out = path.resolve(args[++i]);
  else if (a === "--only") opt.only = new Set(args[++i].split(",").map((s) => s.trim()).filter(Boolean));
  else if (a === "--force") opt.force = true;
  else if (a === "--size") opt.size = parseInt(args[++i], 10);
  else if (a === "--ss") opt.ss = parseInt(args[++i], 10);
  else if (a === "--time") opt.time = parseFloat(args[++i]);
  else {
    console.error(`unknown option ${a}`);
    process.exit(1);
  }
}

const assets = path.join(opt.src, "fabric-mod/src/client/resources/assets/craftcosmetics");
const indexFile = path.join(assets, "cosmetics/index.json");
const previewFile = path.join(opt.src, "tools/preview_model.js");
const outDir = opt.out;
const manifestFile = path.join(outDir, "manifest.json");

try {
  os.setPriority(0, 10); // below normal (Windows) / nice 10, so the game or a build keeps the CPU
} catch {
  // not allowed here: run at normal priority
}

// ---------------------------------------------------------------- preview_model.js, patched for thumbnails
// The tool draws opaque previews on a blue-grey ground with a bluish stand-in player and faint item outlines. For the
// shop it is loaded with a few exact source patches (each must match, so a change in the tool fails loudly here):
// black ground plus a coverage buffer, so the PNG gets real alpha (colour = premultiplied sum / coverage); no outlines
// (they still count for the framing, so all held skins share one scale); a warm, dark stand-in player that can also be
// just a bust.
const THUMB = { player: "full" };

function loadPreview() {
  let src = fs.readFileSync(previewFile, "utf8").replace(/\r\n/g, "\n");
  const patch = (find, replace, what) => {
    const hit = typeof find === "string" ? src.includes(find) : find.test(src);
    if (!hit) throw new Error(`preview_model.js changed: patch "${what}" does not match any more`);
    src = src.replace(find, replace);
  };
  patch("const BACKGROUND = [30, 34, 48];", "const BACKGROUND = [0, 0, 0];", "background");
  patch("rgb.set([64, 72, 92], (yy * w + xx) * 3);", "void 0;", "item outlines");
  patch(
    "const rgb = new Float32Array(n * 3), depth = new Float64Array(n).fill(Infinity);",
    "const rgb = new Float32Array(n * 3), depth = new Float64Array(n).fill(Infinity), cov = new Float32Array(n);",
    "coverage buffer",
  );
  patch(
    /(rgb\[o \+ 2\] = b \* k \+ rgb\[o \+ 2\] \* \(1 - k\);)(\s*continue;)/,
    "$1 cov[i] = k + cov[i] * (1 - k);$2",
    "glow coverage",
  );
  patch("depth[i] = z;", "depth[i] = z; cov[i] = k + cov[i] * (1 - k);", "coverage");
  const start = src.indexOf("\tconst out = {w: size, h: size, px: new Uint8ClampedArray(size * size * 4)};");
  const end = start < 0 ? -1 : src.indexOf("\treturn out;\n}", start);
  if (start < 0 || end < 0) throw new Error('preview_model.js changed: patch "downsample" does not match any more');
  src =
    src.slice(0, start) +
    `\tconst out = {w: size, h: size, px: new Uint8ClampedArray(size * size * 4)};
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		let r = 0, g = 0, b = 0, a = 0;
		for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) {
			const i = (y * ss + dy) * w + x * ss + dx;
			r += rgb[i * 3];
			g += rgb[i * 3 + 1];
			b += rgb[i * 3 + 2];
			a += cov[i];
		}
		const o = (y * size + x) * 4, k = a > 1e-6 ? 1 / a : 0;
		out.px[o] = r * k;
		out.px[o + 1] = g * k;
		out.px[o + 2] = b * k;
		out.px[o + 3] = a / (ss * ss) * 255;
	}
` +
    src.slice(end);
  patch(
    /function playerTriangles\(out\) \{[\s\S]*?\n\}\n/,
    `function playerTriangles(out) {
	const part = (from, to, color) => worldBox(out, from, to, {color}, null, null, "player");
	if (THUMB.player === "none") return; // a cape alone
	const bust = THUMB.player === "bust"; // head and a stub of the chest, without arms
	part([-4, 24, -4], [4, 32, 4], [74, 71, 68]);
	part([-4, bust ? 20 : 12, -2], [4, 24, 2], [58, 56, 53]);
	if (!bust) {
		part([4, 12, -2], [8, 24, 2], [66, 63, 60]); // right arm (+x)
		part([-8, 12, -2], [-4, 24, 2], [66, 63, 60]);
		part([0, 0, -2], [4, 12, 2], [50, 48, 46]); // right leg
		part([-4, 0, -2], [0, 12, 2], [50, 48, 46]);
	}
	part([1, 27, -4.05], [3, 28, -4], [34, 33, 32]); // eyes, so the face reads from every side
	part([-3, 27, -4.05], [-1, 28, -4], [34, 33, 32]);
}
`,
    "stand-in player",
  );
  const module = { exports: {} };
  const require = createRequire(previewFile);
  new Function("require", "module", "exports", "__filename", "__dirname", "THUMB", src)(
    require,
    module,
    module.exports,
    previewFile,
    path.dirname(previewFile),
    THUMB,
  );
  return module.exports;
}

// ---------------------------------------------------------------- one camera per slot
const HELD = new Set(["shield", "mace", "totem"]);
function cameraFor(slot) {
  if (slot === "cape") return { views: ["34b"], player: "none" }; // alone, so the pattern reads
  if (slot === "wings" || slot === "back") return { views: ["34b"], player: "full" };
  if (slot === "head") return { views: ["34f"], player: "bust" };
  if (slot === "aura") return { views: ["34f"], player: "full" };
  if (HELD.has(slot)) return { views: ["34f"], player: null, held: slot };
  return { views: ["34f"], player: null }; // pet and anything new
}

// ---------------------------------------------------------------- framing the visible part
/** Bounds of the pixels that show (alpha above ~5 %), or null for an empty image. */
function alphaBox({ w, h, px }) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] <= 12) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

/**
 * The square of `side` px around (cx, cy) of an RGBA image, scaled down to `out` px: every output pixel averages a
 * grid of bilinear samples, in premultiplied alpha so edges do not darken; outside the image is transparent.
 */
function cropScale(img, cx, cy, side, out) {
  const { w, h, px } = img;
  const step = side / out;
  const n = Math.max(2, Math.ceil(step) + 1);
  const res = { w: out, h: out, px: new Uint8ClampedArray(out * out * 4) };
  const at = (x, y, c) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : px[(y * w + x) * 4 + c]);
  const sample = (x, y) => {
    const fx = Math.floor(x - 0.5);
    const fy = Math.floor(y - 0.5);
    const tx = x - 0.5 - fx;
    const ty = y - 0.5 - fy;
    const acc = [0, 0, 0, 0];
    for (const [dx, dy, wt] of [
      [0, 0, (1 - tx) * (1 - ty)],
      [1, 0, tx * (1 - ty)],
      [0, 1, (1 - tx) * ty],
      [1, 1, tx * ty],
    ]) {
      const a = (at(fx + dx, fy + dy, 3) / 255) * wt;
      acc[0] += at(fx + dx, fy + dy, 0) * a;
      acc[1] += at(fx + dx, fy + dy, 1) * a;
      acc[2] += at(fx + dx, fy + dy, 2) * a;
      acc[3] += a;
    }
    return acc;
  };
  const left = cx - side / 2;
  const top = cy - side / 2;
  for (let y = 0; y < out; y++) {
    for (let x = 0; x < out; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const s = sample(left + (x + (i + 0.5) / n) * step, top + (y + (j + 0.5) / n) * step);
          r += s[0];
          g += s[1];
          b += s[2];
          a += s[3];
        }
      }
      const o = (y * out + x) * 4;
      const k = a > 1e-6 ? 1 / a : 0;
      res.px[o] = r * k;
      res.px[o + 1] = g * k;
      res.px[o + 2] = b * k;
      res.px[o + 3] = (a / (n * n)) * 255;
    }
  }
  return res;
}

// ---------------------------------------------------------------- RGBA PNG, adaptive row filters
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const x of buf) c = CRC[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, sum]);
};
function encodeRgba({ w, h, px }) {
  const stride = w * 4;
  const img = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
  for (let i = 0; i < img.length; i += 4) if (img[i + 3] === 0) img[i] = img[i + 1] = img[i + 2] = 0;
  const raw = Buffer.alloc((stride + 1) * h);
  const line = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const cur = img.subarray(y * stride, (y + 1) * stride);
    const prev = y ? img.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    let best = -1;
    let bestCost = Infinity;
    for (let f = 0; f < 5; f++) {
      let cost = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? cur[i - 4] : 0;
        const b = prev[i];
        const c = i >= 4 ? prev[i - 4] : 0;
        let p;
        if (f === 0) p = 0;
        else if (f === 1) p = a;
        else if (f === 2) p = b;
        else if (f === 3) p = (a + b) >> 1;
        else {
          const q = a + b - c;
          const pa = Math.abs(q - a);
          const pb = Math.abs(q - b);
          const pc = Math.abs(q - c);
          p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (cur[i] - p) & 255;
        line[i] = v;
        cost += v < 128 ? v : 256 - v;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = f;
        raw[y * (stride + 1)] = f;
        line.copy(raw, y * (stride + 1) + 1);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(raw, { level: 9, memLevel: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- main
const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const { render } = loadPreview();
fs.mkdirSync(outDir, { recursive: true });

let manifest = { settings: null, items: {} };
try {
  manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
} catch {
  // first run
}
const settings = `v2 size ${opt.size} ss ${opt.ss} t ${opt.time} ${fs.statSync(previewFile).size}`;
if (manifest.settings !== settings) manifest = { settings, items: {} };

// never keep a picture of the private totem, whatever put it there
for (const id of NEVER) {
  fs.rmSync(path.join(outDir, `${id}.png`), { force: true });
  delete manifest.items[id];
}

const ids = new Set(index.map((e) => e.id));
for (const file of fs.readdirSync(outDir)) {
  const id = file.replace(/\.png$/, "");
  if (file.endsWith(".png") && !ids.has(id)) {
    fs.rmSync(path.join(outDir, file));
    delete manifest.items[id];
    console.log(`removed ${file} (no longer in the index)`);
  }
}

const done = [];
const skipped = [];
const failed = [];
const started = Date.now();
for (const entry of index) {
  if (opt.only && !opt.only.has(entry.id)) continue;
  if (NEVER.has(entry.id)) {
    skipped.push(`${entry.id} (private, never rendered)`);
    continue;
  }
  const source = entry.model
    ? path.join(assets, "cosmetics", entry.model)
    : entry.cape
      ? path.join(assets, "textures/cape", entry.cape)
      : null;
  if (!source || !fs.existsSync(source)) {
    failed.push(`${entry.id} (no model or cape texture)`);
    continue;
  }
  const out = path.join(outDir, `${entry.id}.png`);
  const stat = fs.statSync(source);
  const cam = cameraFor(entry.slot);
  const key = `${path.relative(assets, source).replace(/\\/g, "/")} ${stat.size} ${Math.round(stat.mtimeMs)} ${JSON.stringify(cam)}`;
  if (!opt.force && manifest.items[entry.id] === key && fs.existsSync(out)) continue;

  THUMB.player = cam.player ?? "full";
  try {
    const t0 = Date.now();
    const options = {
      anim: "idle",
      time: opt.time,
      views: cam.views,
      player: !!cam.player,
      held: cam.held ?? "none",
      size: opt.size,
      ss: opt.ss,
      captions: false,
    };
    const result = render(source, options);
    let image = result.image;
    // The tool frames the geometry, visible or not (empty helper cubes, a pose that moves the model away). When what
    // shows covers less than 70 % of the square, render larger and cut the visible part out, centred, at 86 %.
    let zoom = "";
    const box = alphaBox(image);
    const extent = box ? Math.max(box.x1 - box.x0, box.y1 - box.y0) : opt.size;
    if (extent < opt.size * 0.7) {
      const k = Math.min(3, Math.ceil((opt.size * 0.86) / extent));
      const big = render(source, { ...options, size: opt.size * k, ss: 2 }).image;
      const b = alphaBox(big);
      if (b) {
        const side = Math.min(big.w, Math.max(opt.size, Math.max(b.x1 - b.x0, b.y1 - b.y0) / 0.86));
        image = cropScale(big, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, side, opt.size);
        zoom = ` zoomed ${(big.w / side).toFixed(2)}x`;
      }
    }
    const png = encodeRgba(image);
    fs.writeFileSync(out, png);
    manifest.items[entry.id] = key;
    done.push(entry.id);
    const warn = result.warnings.filter((w) => !/16 MiB|3 MB target/.test(w));
    console.log(
      `${entry.id.padEnd(30)} ${entry.slot.padEnd(7)} ${(png.length / 1024).toFixed(1).padStart(6)} KB ${String(Date.now() - t0).padStart(5)} ms` +
        zoom +
        (warn.length ? `  (${warn.join("; ")})` : ""),
    );
  } catch (err) {
    failed.push(`${entry.id} (${err.message})`);
    fs.rmSync(out, { force: true });
    delete manifest.items[entry.id];
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + "\n");

let total = 0;
let count = 0;
for (const file of fs.readdirSync(outDir)) {
  if (!file.endsWith(".png")) continue;
  total += fs.statSync(path.join(outDir, file)).size;
  count++;
}
console.log(
  `\n${done.length} rendered in ${((Date.now() - started) / 1000).toFixed(1)} s; ${count} thumbnails in public/cosmetics, ` +
    `${(total / 1048576).toFixed(2)} MB`,
);
for (const s of skipped) console.log(`skipped: ${s}`);
for (const f of failed) console.log(`FAILED: ${f}`);
if (failed.length) process.exitCode = 1;
