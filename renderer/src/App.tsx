import React, { useEffect, useMemo, useRef, useState } from 'react'

type FileResult = { content: string; path: string | null } | null

export default function App() {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const hotspotRef = useRef<HTMLDivElement | null>(null)
  // no delay; simple fade only
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [content, setContent] = useState('')
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [active, setActive] = useState(true)
  // Toolbar overlays content; no editor offset

  // Title and status text
  const fileName = useMemo(() => (currentPath ? currentPath.split(/[\\/]/).pop()! : 'Untitled'), [currentPath])
  const statusText = useMemo(() => `${currentPath ?? 'Untitled'}${dirty ? ' • Modified' : ''}`, [currentPath, dirty])

  useEffect(() => {
    document.title = `${fileName}${dirty ? ' *' : ''} — Plain Text`
  }, [fileName, dirty])

  // Load a new doc initially
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: FileResult = await (window as any).api?.newFile()
        if (!mounted || !res) return
        setContent(res.content || '')
        setCurrentPath(res.path || null)
        setDirty(false)
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  // Hook up window control state
  useEffect(() => {
    const off = (window as any).api?.windowControls?.onState?.((state: any) => {
      setMaximized(!!state?.maximized)
      if (typeof state?.active === 'boolean') setActive(state.active)
    })
    return () => { if (typeof off === 'function') off() }
  }, [])

  // Hook up menu events
  useEffect(() => {
    const off = (window as any).api?.onMenu?.(async (action: string) => {
      switch (action) {
        case 'menu:new':
          await handleNew()
          break
        case 'menu:open':
          await handleOpen()
          break
        case 'menu:save':
          await handleSave()
          break
        case 'menu:saveAs':
          await handleSaveAs()
          break
      }
    })
    return () => { if (typeof off === 'function') off() }
  }, [content, currentPath, dirty])

  // Hover show/hide helpers
  function showToolbar() { setToolbarVisible(true) }
  function hideToolbarImmediate() { setToolbarVisible(false) }

  function handleRootMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const y = e.clientY
    // 상단 30px 영역에서 보이기 (기존 10px에서 확장)
    if (y <= 30) {
      showToolbar()
      return
    }
    // 툴바 영역에서는 체크하지 않음 (onMouseEnter/Leave가 처리)
    const el = toolbarRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom + 10) { // 툴바 + 10px 버퍼
        return // 툴바 영역에서는 아무것도 하지 않음
      }
    }
    hideToolbarImmediate()
  }

  async function handleNew() {
    const res: FileResult = await (window as any).api?.newFile()
    if (!res) return
    setContent(res.content || '')
    setCurrentPath(res.path || null)
    setDirty(false)
  }

  async function handleOpen() {
    const res: FileResult = await (window as any).api?.openFile()
    if (!res) return
    setContent(res.content || '')
    setCurrentPath(res.path || null)
    setDirty(false)
  }

  async function handleSave() {
    const res = await (window as any).api?.saveFile?.(content)
    if (res?.path) setCurrentPath(res.path)
    setDirty(false)
  }

  async function handleSaveAs() {
    const res = await (window as any).api?.saveFileAs?.(content)
    if (res?.path) setCurrentPath(res.path)
    setDirty(false)
  }

  return (
  <div className="fixed inset-0 font-mono" onMouseMove={handleRootMouseMove}>
      {/* Toolbar (macOS-style titlebar) */}
      <div
        id="toolbar"
        ref={toolbarRef}
        className={[
          'fixed top-0 left-0 right-0 z-[100] -webkit-app-region-drag w-[100%] transition-opacity duration-200 ease-out',
          toolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        ].join(' ')}
        onMouseEnter={showToolbar}
        onMouseLeave={hideToolbarImmediate}
        style={{ paddingBottom: '10px' }} // 하단 버퍼 영역 추가
      >
  <div className="px-3 flex items-center relative border-gray-200 dark:border-gray-700" style={{ height: '28px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '6px' }}>
          {/* Traffic lights (left) */}
          <div className="flex items-center gap-[8px] -webkit-app-region-no-drag select-none pl-[2px]">
            {/* Close */}
            <button
              title="Close"
              onClick={() => (window as any).api?.windowControls?.close?.()}
              className={[
          'traffic-btn relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition aspect-square border-0',
          active ? 'opacity-100' : 'opacity-75'
              ].join(' ')}
              style={{ backgroundColor: '#ff5f57', border: 'none', outline: 'none' }}
              aria-label="Close"
            >
            </button>
            {/* Minimize */}
            <button
              title="Minimize"
              onClick={() => (window as any).api?.windowControls?.minimize?.()}
              className={[
          'traffic-btn relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition aspect-square border-0',
          active ? 'opacity-100' : 'opacity-75'
              ].join(' ')}
              style={{ backgroundColor: '#febc2e', border: 'none', outline: 'none' }}
              aria-label="Minimize"
            >
            </button>
            {/* Maximize / Restore */}
            <button
              title={maximized ? 'Restore' : 'Maximize'}
              onClick={() => (window as any).api?.windowControls?.maximizeOrRestore?.()}
              className={[
          'traffic-btn relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition aspect-square border-0',
          active ? 'opacity-100' : 'opacity-75'
              ].join(' ')}
              style={{ backgroundColor: '#28c840', border: 'none', outline: 'none' }}
              aria-label={maximized ? 'Restore' : 'Maximize'}
            >
            </button>
          </div>
        </div>
      </div>

      {/* Editor (fixed position; toolbar overlays) */}
      <textarea
        className="fixed inset-0 w-full h-full resize-none appearance-none border-none outline-none text-sm leading-relaxed"
        style={{ paddingTop: 18, paddingLeft: 8, paddingRight: 8, paddingBottom: 8, boxSizing: 'border-box', willChange: 'transform' }}
        spellCheck={false}
        placeholder="Start typing…"
        value={content}
        onChange={(e) => { setContent(e.target.value); setDirty(true) }}
      />

      {/* Status bar */}
      {/* <div className="h-6 p-1 text-xs bg-gray-800 border-t border-gray-700 text-gray-500">{statusText}</div> */}
    </div>
  )
}
