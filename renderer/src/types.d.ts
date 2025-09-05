export {}

declare global {
  interface Window {
    api?: {
      newFile: () => Promise<{ content: string; path: string | null } | null>
      openFile: () => Promise<{ content: string; path: string | null } | null>
      saveFile: (content: string) => Promise<{ path?: string } | null>
      saveFileAs: (content: string) => Promise<{ path?: string } | null>
      onMenu: (handler: (action: 'menu:new' | 'menu:open' | 'menu:save' | 'menu:saveAs') => void) => () => void
      windowControls: {
        minimize: () => Promise<void>
        maximizeOrRestore: () => Promise<void>
        close: () => Promise<void>
        onState: (handler: (state: { maximized: boolean }) => void) => () => void
      }
    }
  }
}

