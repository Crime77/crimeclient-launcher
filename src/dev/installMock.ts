// Imported first in main.tsx: in a plain browser dev session, fake the Tauri backend.
import { installTauriMock } from "./tauriMock";

if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) {
  installTauriMock();
}
