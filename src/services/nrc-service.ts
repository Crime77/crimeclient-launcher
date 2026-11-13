import { invoke } from '@tauri-apps/api/core';
import type { UpdateInfo } from '../types/updater';
import type { Profile } from '../types/profile';
import { useProfileStore } from '../store/profile-store';
import { visibleProfiles } from '../store/insider-store';
import { loadInsiderStatus, refreshInsiderAccess } from './insider-service';

/**
 * Triggers a refresh of the Norisk packs configuration from the backend.
 *
 * @returns A promise that resolves when the refresh is complete.
 * @throws If the backend command fails.
 */
export const refreshNoriskPacks = (): Promise<void> => {
  return invoke('refresh_norisk_packs');
};

/**
 * Triggers a refresh of the standard versions configuration from the backend.
 *
 * @returns A promise that resolves with the standard profiles.
 * @throws If the backend command fails.
 */
export const refreshStandardVersions = (): Promise<Profile[]> => {
  return invoke('refresh_standard_versions');
};

/**
 * Refreshes both Norisk packs and standard versions configurations.
 * Logs success or errors to the console.
 */
export const refreshNrcDataOnMount = async (): Promise<void> => {
  // Direkt setState verwenden, um den Ladezustand zu Beginn zu setzen
  useProfileStore.setState({ loading: true, error: null });
  // CrimeClient Insider: what this PC knows about the active account, before the lists are filtered
  await loadInsiderStatus();

  // Introduce a 5-second delay for testing
  //console.log("[TEST] Starting 5-second delay in refreshNrcDataOnMount...");
  //await new Promise(resolve => setTimeout(resolve, 5000));
  //console.log("[TEST] 5-second delay finished.");

  try {
    let nrcPacksSuccess = false;
    let standardVersionsSuccess = false;

    try {
      await refreshNoriskPacks();
      console.log("Norisk Packs updated successfully on mount!");
      nrcPacksSuccess = true;
    } catch (error) {
      console.error("Failed to refresh Norisk Packs on mount:", error);
    }

    try {
      const standardProfiles = await refreshStandardVersions();
      console.log("Standard Versions updated successfully on mount!");
      // Store the standard profiles in the profile store (CrimeClient Insider only with access)
      useProfileStore.setState({ standardProfiles: visibleProfiles(standardProfiles) });
      standardVersionsSuccess = true;
    } catch (error) {
      console.error("Failed to refresh Standard Versions on mount:", error);
    }

    // Fetch profiles from the store after NRC data is refreshed
    // This ensures the profile list (including standard versions) and last played are up-to-date.
    if (nrcPacksSuccess || standardVersionsSuccess) { // Or simply always call it if appropriate
      try {
        console.log("Refreshing profiles state after NRC data update...");
        await useProfileStore.getState().fetchProfiles();
        console.log("Profiles state refreshed successfully.");
        // fetchProfiles setzt loading: false bei Erfolg oder Fehler
      } catch (error) {
        console.error("Failed to refresh profiles state after NRC data update:", error);
        // fetchProfiles sollte seinen eigenen Ladezustand und Fehler behandeln.
        // Wenn fetchProfiles hier einen Fehler wirft, wird er vom äußeren Catch behandelt.
      }
    }
  } catch (error) {
    // Dieser Catch fängt Fehler von refreshNoriskPacks, refreshStandardVersions
    // oder wenn fetchProfiles selbst einen Fehler wirft, der nicht intern zu loading:false führt.
    console.error("Error during NRC data refresh or profile fetching process:", error);
    useProfileStore.setState({
      error: "Failed to initialize or refresh app data.",
      loading: false, // Sicherstellen, dass der Ladezustand beendet wird
    });
  }
  // Kein expliziter finally-Block hier nötig, um loading auf false zu setzen,
  // da dies entweder durch fetchProfiles() oder den catch-Block oben abgedeckt wird.

  // CrimeClient Insider: ask the API about the active account after the normal refresh
  void refreshInsiderAccess();
};

/**
 * Checks if an application update is available.
 * Uses the beta channel setting from the launcher configuration.
 *
 * @returns A promise that resolves to UpdateInfo if an update is available, or null if up to date.
 * @throws If the backend command fails.
 */
export const checkUpdateAvailable = (): Promise<UpdateInfo | null> => {
  return invoke('check_update_available_command');
};

/**
 * Downloads and installs an available application update.
 * Uses the beta channel setting from the launcher configuration.
 * The application will restart automatically after successful installation.
 *
 * @returns A promise that resolves when the update process is complete.
 * @throws If the backend command fails or no update is available.
 */
export const downloadAndInstallUpdate = (): Promise<void> => {
  return invoke('download_and_install_update_command');
};

// Re-export logging utilities for backward compatibility
export { log as logMessage, logDebug as logMessageDebug, logInfo as logMessageInfo, logWarn as logMessageWarn, logError as logMessageError } from '../utils/logging-utils';