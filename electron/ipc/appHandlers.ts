/**
 * App IPC Handlers
 *
 * Exposes application metadata to the renderer process:
 * - app:get-version - Returns the running app version (package.json version)
 */

import { app, ipcMain } from 'electron';

export function registerAppHandlers(): void {
  ipcMain.removeHandler('app:get-version');
  ipcMain.handle('app:get-version', () => app.getVersion());
}
