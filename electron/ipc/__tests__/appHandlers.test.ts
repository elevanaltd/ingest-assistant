import { describe, test, expect, vi, beforeEach } from 'vitest'
import { app, ipcMain } from 'electron'
import { registerAppHandlers } from '../appHandlers'

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn()
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  }
}))

describe('App IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('registers app:get-version handler on initialization', () => {
    registerAppHandlers()

    expect(ipcMain.handle).toHaveBeenCalledWith(
      'app:get-version',
      expect.any(Function)
    )
  })

  test('app:get-version handler returns the running app version', async () => {
    vi.mocked(app.getVersion).mockReturnValue('3.0.2')

    registerAppHandlers()

    const handler = vi.mocked(ipcMain.handle).mock.calls.find(
      ([channel]) => channel === 'app:get-version'
    )?.[1]

    expect(handler).toBeDefined()
    const result = await handler!({} as Electron.IpcMainInvokeEvent)

    expect(result).toBe('3.0.2')
  })
})
