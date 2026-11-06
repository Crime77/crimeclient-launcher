// Dev mock for the clips page, the clip editor window and the log windows (see src/dev/tauriMock.ts).
//
//   http://localhost:1430/?clips#/clips                     clips page (clips switched on)
//   http://localhost:1430/clip-editor-window.html           clip editor (records an 8 s sample first)
//   http://localhost:1430/minecraft-log-window.html         game log window with two instances
//   http://localhost:1430/single-log-window.html?instanceId=proc-crime&instanceName=CrimeClient&profileId=p-crime&accountName=crime77
//   http://localhost:1430/updater.html?demo                 updater steps (handled in tauriMock.ts)
//   http://localhost:1430/?overlay  (or ?overlay=error)     clip overlay window, saved and failed notices in turn
//
// Clip thumbnails are crops of public images drawn at runtime; nothing large lives in this file.

const page = typeof location !== "undefined" ? location : ({ pathname: "", search: "", hash: "" } as Location);
const inLogWindow = page.pathname.includes("log-window");
const inEditor = page.pathname.includes("clip-editor");
const clipsOn = () => inEditor || page.search.includes("clips") || page.hash.includes("clips");

// ------------------------------------------------------------------ helpers

type Internals = {
  invoke: (cmd: string, args?: unknown) => Promise<unknown>;
  convertFileSrc?: (path: string, protocol?: string) => string;
};
const internals = () => (window as unknown as { __TAURI_INTERNALS__?: Internals }).__TAURI_INTERNALS__;

// thumbnails and the sample video are browser URLs; let them through convertFileSrc unchanged
let srcPatched = false;
function patchConvertFileSrc() {
  const tauri = internals();
  if (srcPatched || !tauri?.convertFileSrc) return;
  srcPatched = true;
  const original = tauri.convertFileSrc;
  tauri.convertFileSrc = (path, protocol) =>
    typeof path === "string" && (/^(data:|blob:|https?:)/.test(path) || (path.startsWith("/") && !path.startsWith("//")))
      ? path
      : original(path, protocol);
}

// the base mock's launcher config, with clips switched on
let readingConfig = false;
function configWithClips(): Promise<unknown> | undefined {
  if (readingConfig || !clipsOn()) return undefined;
  const tauri = internals();
  if (!tauri) return undefined;
  readingConfig = true;
  const base = tauri.invoke("get_launcher_config");
  readingConfig = false;
  return base.then((config) => {
    const c = config as { clips?: Record<string, unknown> };
    return { ...c, clips: { ...c.clips, enabled: true } };
  });
}

// /?overlay renders the clip overlay window (main.tsx picks it by the window label) and plays its notices.
// This module loads before tauriMock.ts calls mockWindows("main"); __TAURI_INTERNALS__ must not exist yet (installMock
// checks for it), so a one-shot setter on Object.prototype swaps the label as mockWindows assigns `.metadata`.
if (typeof window !== "undefined" && page.search.includes("overlay") && !inLogWindow && !inEditor) {
  const label = "clip-overlay";
  Object.defineProperty(Object.prototype, "metadata", {
    configurable: true,
    set(this: object, value: unknown) {
      delete (Object.prototype as Record<string, unknown>).metadata;
      const isWindowMeta = typeof value === "object" && value !== null && "currentWindow" in value;
      Object.defineProperty(this, "metadata", {
        value: isWindowMeta ? { currentWindow: { label }, currentWebview: { windowLabel: label, label } } : value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    },
  });

  const notices = [
    {
      event: "clip_saved",
      payload: { path: "C:\\Users\\crime77\\Videos\\CrimeClient Clips\\Clutch 1v3 im End.mp4", duration_seconds: 31.2, size_bytes: 48_400_000, width: 1920, height: 1080 },
    },
    { event: "clip_error", payload: { code: "buffer_empty", message: "buffer empty", recoverable: true } },
  ];
  let next = page.search.includes("overlay=error") ? 1 : 0;
  const show = () => {
    const notice = notices[next++ % notices.length];
    void import("@tauri-apps/api/event").then((m) => m.emit(notice.event, notice.payload));
  };
  setTimeout(() => {
    show();
    setInterval(show, 3600);
  }, 1200);
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ clips

const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;
const DAY = 86_400;
const DIR = "C:\\Users\\crime77\\Videos\\CrimeClient Clips\\";

interface MockClip {
  path: string;
  name: string;
  sizeBytes: number;
  createdAt: number;
  durationSeconds: number | null;
  game: string | null;
  thumbnail: string | null;
  favourite: boolean;
}

const clipSeeds: [string, number, number, string, boolean][] = [
  ["Clutch 1v3 im End", 6 * 60, 31, "Minecraft", true],
  ["Drache down", 3 * HOUR, 45, "Minecraft", false],
  ["Elytra durch den Canyon", 20 * HOUR, 28, "Minecraft", false],
  ["Mace-Kombo auf CraftAttack", 2 * DAY, 30, "Minecraft", true],
  ["Base-Rundgang", 3 * DAY + 4 * HOUR, 92, "Minecraft", false],
  ["Netherportal-Fail", 6 * DAY, 18, "Minecraft", false],
  ["Speedbridge 40 Blöcke", 9 * DAY, 24, "Minecraft", false],
  ["Rust Raid Nacht", 34 * DAY, 60, "Rust", false],
  ["Turm aus Sand", 38 * DAY, 15, "Minecraft", false],
  ["Season-3-Start", 41 * DAY, 120, "Minecraft", true],
];

const clips: MockClip[] = clipSeeds.map(([name, ago, seconds, game, favourite], index) => ({
  path: `${DIR}${name}.mp4`,
  name,
  sizeBytes: Math.round(seconds * (1.4 + (index % 3) * 0.35) * 1024 * 1024),
  createdAt: NOW - ago,
  durationSeconds: seconds,
  game,
  thumbnail: null,
  favourite,
}));

let thumbsReady: Promise<void> | null = null;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function makeThumbs(): Promise<void> {
  if (thumbsReady) return thumbsReady;
  thumbsReady = (async () => {
    const sources = (await Promise.all(["/background.jpeg", "/welcome-background.jpg", "/mc_door.png"].map(loadImage)))
      .filter((image): image is HTMLImageElement => image !== null);
    if (sources.length === 0) return;
    const random = seeded(7);
    clips.forEach((clip, index) => {
      if (index === 6) return; // one clip without a still, to show the fallback
      const image = sources[index % sources.length];
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 216;
      const context = canvas.getContext("2d");
      if (!context) return;
      const zoom = 1.15 + random() * 0.9;
      const width = image.width / zoom;
      const height = width * (9 / 16);
      const x = random() * Math.max(0, image.width - width);
      const y = random() * Math.max(0, image.height - height);
      context.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);
      clip.thumbnail = canvas.toDataURL("image/jpeg", 0.78);
    });
  })();
  return thumbsReady;
}

const LIMIT = 10 * 1024 ** 3;

function storage() {
  return { usedBytes: clips.reduce((sum, clip) => sum + clip.sizeBytes, 0), limitBytes: LIMIT, clipCount: clips.length };
}

const status = {
  running: true,
  runtime: { state: "ready" },
  state: "buffering",
  blocked_by_fullscreen: false,
  engine_version: "0.9.4",
  adapter: "NVIDIA GeForce RTX 4070",
  available_encoders: ["auto", "nvenc", "software"],
  capabilities: [
    { codec: "h264", encoder: "nvenc", available: true, hardware: true, detail: null },
    { codec: "h265", encoder: "nvenc", available: true, hardware: true, detail: null },
    { codec: "av1", encoder: "nvenc", available: true, hardware: true, detail: null },
    { codec: "h264", encoder: "software", available: true, hardware: false, detail: null },
  ],
  active_codec: "h264",
  active_encoder: "nvenc",
  capture_method: "graphics hook",
  capture_fps: 60,
  dropped_frames: 0,
  retry_in_seconds: null,
  last_error: null,
  audio_devices: [
    { id: "dev-1", name: "Lautsprecher (Realtek Audio)", is_default: true },
    { id: "dev-2", name: "Headset (Arctis Nova 7)", is_default: false },
  ],
  microphones: [{ id: "mic-1", name: "Mikrofon (Arctis Nova 7)", is_default: true }],
  supports_game_only_audio: true,
};

// ------------------------------------------------------------------ clip editor sample

const SAMPLE_SECONDS = 8;
let sample: Promise<string> | null = null;

/** Inserts the Duration a MediaRecorder WebM lacks, so the editor sees a finite, seekable clip. */
async function withDuration(blob: Blob, ms: number): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const find = (id: number[], from = 0, to = Math.min(bytes.length, 8192)) => {
    for (let i = from; i < to - id.length; i++) {
      if (id.every((b, k) => bytes[i + k] === b)) return i;
    }
    return -1;
  };
  const info = find([0x15, 0x49, 0xa9, 0x66]);
  if (info < 0) return blob;
  const sizeAt = info + 4;
  let width = 1;
  while (width <= 8 && !(bytes[sizeAt] & (0x80 >> (width - 1)))) width++;
  let size = bytes[sizeAt] & (0xff >> width);
  for (let k = 1; k < width; k++) size = size * 256 + bytes[sizeAt + k];
  const bodyAt = sizeAt + width;
  const body = bytes.slice(bodyAt, bodyAt + size);

  const existing = find([0x44, 0x89], bodyAt, bodyAt + size);
  if (existing >= 0 && bytes[existing + 2] === 0x88) {
    new DataView(bytes.buffer).setFloat64(existing + 3, ms);
    return new Blob([bytes], { type: blob.type });
  }

  const duration = new Uint8Array(11);
  duration.set([0x44, 0x89, 0x88]);
  new DataView(duration.buffer).setFloat64(3, ms);
  const grown = new Uint8Array(8);
  grown[0] = 0x01;
  let rest = size + duration.length;
  for (let k = 7; k >= 1; k--) {
    grown[k] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  return new Blob([bytes.slice(0, sizeAt), grown, body, duration, bytes.slice(bodyAt + size)], { type: blob.type });
}

function recordSample(): Promise<string> {
  if (sample) return sample;
  sample = (async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext("2d");
    const image = await loadImage("/background.jpeg");
    const stream = canvas.captureStream(30);
    const type = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    const started = performance.now();
    const draw = () => {
      if (!context) return;
      const t = (performance.now() - started) / 1000;
      if (image) {
        const zoom = 1.25 + t * 0.04;
        const w = image.width / zoom;
        const h = w * (9 / 16);
        const x = Math.min(image.width - w, (image.width - w) * (t / SAMPLE_SECONDS));
        context.drawImage(image, x, (image.height - h) / 2, w, h, 0, 0, canvas.width, canvas.height);
      } else {
        context.fillStyle = "#1a1a1d";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.fillStyle = "rgba(0,0,0,0.55)";
      context.fillRect(24, canvas.height - 64, 150, 40);
      context.fillStyle = "#edebe8";
      context.font = "600 22px 'JetBrains Mono', monospace";
      context.fillText(`00:${t.toFixed(2).padStart(5, "0")}`, 36, canvas.height - 36);
    };
    draw();
    const timer = window.setInterval(draw, 1000 / 30);
    recorder.start(250);
    await new Promise((resolve) => window.setTimeout(resolve, SAMPLE_SECONDS * 1000));
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.stop();
    await stopped;
    window.clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
    const fixed = await withDuration(new Blob(chunks, { type: "video/webm" }), SAMPLE_SECONDS * 1000);
    return URL.createObjectURL(fixed);
  })();
  return sample;
}

function peaks(seed: number, count: number, loud: number): number[] {
  const random = seeded(seed);
  let level = 0.4;
  return Array.from({ length: count }, (_, i) => {
    level = Math.max(0.05, Math.min(1, level + (random() - 0.5) * 0.35));
    const burst = i % 37 < 4 ? 0.9 : 0;
    return Math.round(Math.min(1, Math.max(level * loud, burst * random())) * 255);
  });
}

const details = {
  durationSeconds: SAMPLE_SECONDS,
  width: 960,
  height: 540,
  fps: 30,
  peakStepMs: 50,
  audioTracks: [
    { label: "Game", stream: 1, adjustable: true, peaks: peaks(3, (SAMPLE_SECONDS * 1000) / 50, 0.8) },
    { label: "Microphone", stream: 2, adjustable: true, peaks: peaks(11, (SAMPLE_SECONDS * 1000) / 50, 0.45) },
  ],
};

// ------------------------------------------------------------------ log windows

const started = new Date(Date.now() - 23 * 60 * 1000);
const processes = [
  {
    id: "proc-crime", profile_id: "p-crime", start_time: started.toISOString(), state: "Running", pid: 18244,
    account_uuid: "00000000-0000-0000-0000-000000000001", account_name: "crime77", minecraft_version: "26.3",
    modloader: "fabric", modloader_version: "0.17.2", profile_name: "CrimeClient", memory_max_mb: 4096,
    log_session_id: "session-crime",
  },
  {
    id: "proc-craftattack", profile_id: "p-craftattack", start_time: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    state: "Running", pid: 20112, account_uuid: "00000000-0000-0000-0000-000000000001", account_name: "crime77",
    minecraft_version: "26.3", modloader: "fabric", modloader_version: "0.17.2", profile_name: "CraftAttack",
    memory_max_mb: 6144, log_session_id: "session-craftattack",
  },
];

function clock(offsetSeconds: number): string {
  const at = new Date(started.getTime() + offsetSeconds * 1000);
  return at.toTimeString().slice(0, 8);
}

const LOG_SCRIPT: [string, string, string][] = [
  ["main", "INFO", "Loading Minecraft 26.3 with Fabric Loader 0.17.2"],
  ["main", "INFO", "Loading 63 mods:"],
  ["main", "INFO", "\t- craftcosmetics 2.4.1"],
  ["main", "INFO", "\t- fabric-api 0.131.0+26.3"],
  ["main", "INFO", "\t- sodium 0.7.2+mc26.3"],
  ["main", "INFO", "\t- iris 1.9.4+mc26.3"],
  ["main", "WARN", "Mod resolution: lambdynlights 4.3.1 recommends sodium 0.7.3 or newer"],
  ["main", "INFO", "SpongePowered MIXIN Subsystem Version=0.8.7 Source=union:/mods/fabric-loader.jar Service=Knot/Fabric Env=CLIENT"],
  ["main", "DEBUG", "Loaded Fabric development mappings for mixin remapper!"],
  ["main", "INFO", "Compatibility level set to JAVA_21"],
  ["Datafixer Bootstrap", "INFO", "174 Datafixer optimizations took 211 milliseconds"],
  ["Render thread", "INFO", "Environment: Environment[sessionHost=https://sessionserver.mojang.com, servicesHost=https://api.minecraftservices.com, name=PROD]"],
  ["Render thread", "INFO", "Setting user: crime77"],
  ["Render thread", "INFO", "[CrimeClient] Starting CrimeClient 2.4.1 (craftcosmetics)"],
  ["Render thread", "INFO", "[CrimeClient] Catalogue: 237 cosmetics, 18 emotes (remote manifest 2026-11-04)"],
  ["Render thread", "INFO", "Backend library: LWJGL version 3.3.4-snapshot"],
  ["Render thread", "WARN", "Failed to load texture minecraft:textures/entity/signs/hanging/pale_oak.png"],
  ["Render thread", "INFO", "Reloading ResourceManager: vanilla, fabric, craftcosmetics, sodium, iris"],
  ["Worker-Main-3", "INFO", "Found unifont_all_no_pua-16.0.01.hex, loading"],
  ["Render thread", "INFO", "OpenGL: NVIDIA GeForce RTX 4070/PCIe/SSE2 GL version 4.6.0 NVIDIA 566.36"],
  ["Render thread", "INFO", "Sound engine started"],
  ["Render thread", "INFO", "Created: 2048x1024x4 minecraft:textures/atlas/blocks.png-atlas"],
  ["Render thread", "INFO", "Created: 512x512x4 craftcosmetics:textures/atlas/cosmetics.png-atlas"],
  ["Render thread", "DEBUG", "[Sodium] Chunk renderer using 6 worker threads"],
  ["Render thread", "INFO", "[Iris] Shaderpack Photon v1.4 loaded in 412 ms"],
  ["Render thread", "INFO", "Connecting to craftattack.crime77.de, 25565"],
  ["Netty Client IO #0", "INFO", "Server brand: Paper"],
  ["Render thread", "INFO", "[CrimeClient] Cosmetics sync: 7 players"],
  ["Render thread", "INFO", "[CHAT] crime77 joined the game"],
  ["Render thread", "WARN", "Received passengers for unknown entity"],
  ["Render thread", "INFO", "[CHAT] <Lumi> gg, Drache liegt"],
  ["Render thread", "ERROR", "Error executing task on Client"],
  ["Render thread", "ERROR", "java.lang.NullPointerException: Cannot invoke \"net.minecraft.world.entity.Entity.getId()\" because \"entity\" is null"],
  ["Render thread", "ERROR", "\tat net.minecraft.client.multiplayer.ClientPacketListener.handleSetEntityPassengersPacket(ClientPacketListener.java:1312)"],
  ["Render thread", "ERROR", "\tat net.minecraft.network.protocol.PacketUtils.lambda$ensureRunningOnSameThread$0(PacketUtils.java:27)"],
  ["Render thread", "INFO", "[CrimeClient] Clip saved: Clutch 1v3 im End (31 s)"],
  ["Render thread", "INFO", "[CHAT] <crime77> wer kommt mit ins End?"],
  ["Server thread", "DEBUG", "Autosave in 300 s"],
  ["Render thread", "TRACE", "[Sodium] Rebuilt 412 sections in 9.8 ms"],
  ["Render thread", "INFO", "Saved screenshot as 2026-11-05_21.12.07.png"],
];

const LIVE_LINES: [string, string, string][] = [
  ["Render thread", "INFO", "[CHAT] <Lumi> bin gleich da"],
  ["Render thread", "DEBUG", "[Sodium] Chunk build queue: 3 pending"],
  ["Render thread", "INFO", "[CrimeClient] Emote played: electro_shuffle"],
  ["Render thread", "WARN", "Ignoring unknown attribute 'generic.lunge_reach'"],
  ["Render thread", "INFO", "[CHAT] Kalle has made the advancement [Free the End]"],
];

function scriptText(lines: [string, string, string][], offset: number): string {
  return lines.map(([thread, level, text], i) => `[${clock(offset + i * 2)}] [${thread}/${level}]: ${text}`).join("\n");
}

const cursors = new Map<string, number>();
let livePushed = 0;

function logCursor(sessionId: string, cursor: number) {
  if (cursor === 0) {
    const lines = sessionId === "session-craftattack" ? LOG_SCRIPT.slice(0, 22) : LOG_SCRIPT;
    cursors.set(sessionId, 1);
    return { cursor: 1, output: scriptText(lines, 0), new_file: false };
  }
  // the CrimeClient session keeps writing, one line every few polls
  if (sessionId === "session-crime" && Math.random() < 0.25) {
    const line = LIVE_LINES[livePushed % LIVE_LINES.length];
    livePushed++;
    return { cursor: cursor + 1, output: scriptText([line], 80 + livePushed * 3), new_file: false };
  }
  return { cursor, output: "", new_file: false };
}

let metricsTimer = 0;
function startMetrics() {
  if (metricsTimer) return;
  const random = seeded(5);
  const emit = () =>
    void import("@tauri-apps/api/event").then(({ emit: send }) => {
      for (const [id, base] of [["proc-crime", 2.6], ["proc-craftattack", 3.9]] as const) {
        void send("state_event", {
          event_type: "process_metrics_update",
          event_id: `metrics-${id}`,
          target_id: id,
          message: JSON.stringify({
            process_id: id,
            memory_bytes: Math.round((base + random() * 0.4) * 1024 ** 3),
            cpu_percent: 18 + random() * 22,
            timestamp: new Date().toISOString(),
          }),
          progress: null,
          error: null,
        });
      }
    });
  metricsTimer = window.setInterval(emit, 2000);
  window.setTimeout(emit, 600);
}

// ------------------------------------------------------------------ handler

export function handle(cmd: string, args: Record<string, unknown>): unknown {
  patchConvertFileSrc();

  switch (cmd) {
    case "get_launcher_config":
      return configWithClips();
    case "capture_status":
      return structuredClone(status);
    case "capture_encoder_capabilities":
      return structuredClone(status.capabilities);
    case "capture_apply_settings":
      return [];
    case "clip_list":
      return makeThumbs().then(() => structuredClone(clips));
    case "clip_storage_usage":
      return storage();
    case "clip_set_favourite": {
      const clip = clips.find((entry) => entry.path === args.path);
      if (clip) clip.favourite = Boolean(args.favourite);
      return null;
    }
    case "clip_rename": {
      const clip = clips.find((entry) => entry.path === args.path);
      if (!clip) return null;
      clip.name = String(args.name);
      clip.path = `${DIR}${clip.name}.mp4`;
      return clip.path;
    }
    case "clip_delete": {
      const index = clips.findIndex((entry) => entry.path === args.path);
      if (index >= 0) clips.splice(index, 1);
      return null;
    }
    case "clip_open_apps":
      return [
        { pid: 4120, executable: "javaw.exe", name: "Minecraft 26.3" },
        { pid: 8812, executable: "RustClient.exe", name: "Rust" },
        { pid: 9920, executable: "Spotify.exe", name: "Spotify" },
        { pid: 10244, executable: "Discord.exe", name: "Discord" },
      ];
    case "clip_list_screens":
      return [
        { device: "\\\\.\\DISPLAY1", width: 2560, height: 1440, primary: true },
        { device: "\\\\.\\DISPLAY2", width: 1920, height: 1080, primary: false },
      ];
    case "clip_editor_current":
      return inEditor ? recordSample().then((path) => ({ path, name: "Clutch 1v3 im End" })) : null;
    case "clip_details":
      return structuredClone(details);
    case "clip_prepare_preview":
    case "clip_save_thumbnail":
    case "clip_reveal":
    case "clip_open_folder":
    case "clip_open_editor":
      return null;
  }

  if (!inLogWindow) return undefined;
  switch (cmd) {
    case "get_processes":
      startMetrics();
      return structuredClone(processes);
    case "get_process":
      return structuredClone(processes.find((p) => p.id === args.processId) ?? null);
    case "get_process_log_cursor":
      return logCursor(String(args.sessionId), Number(args.cursor ?? 0));
    case "open_single_log_window":
    case "open_profile_folder":
    case "focus_main_window":
    case "stop_process":
      return null;
    case "upload_log_to_mclogs":
    case "upload_log_to_mclogs_command":
      return "https://mclo.gs/a1B2c3D";
  }
  return undefined;
}
