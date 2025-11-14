# Memo-Proto Bear 스타일 에디터 구현 가이드

> **목표**: Bear 앱처럼 마크다운 문법과 렌더링된 결과를 **동시에** 보여주는 Hybrid Live Editor 구현

## 📋 프로젝트 현황

**현재 기술 스택**
- Electron 31 + React 18 + TypeScript
- Vite 5.3 (빌드 도구)
- TailwindCSS 4.1
- 현재 에디터: `<textarea>` (일반 텍스트)

**현재 구조**
```
memo-proto/
├── main.js              # 메인 프로세스 (파일 I/O, IPC)
├── preload.js           # 보안 브릿지
└── renderer/src/
    └── App.tsx          # 에디터 UI (현재 textarea 기반)
```

**현재 기능**
- macOS 스타일 트래픽 라이트 (Close, Minimize, Maximize)
- 파일 열기/저장/다른 이름으로 저장
- 자동 숨김 툴바 (상단 30px 호버 시 표시)
- Dirty state 추적 (수정 여부 표시)

---

## 🎯 Bear 스타일 에디터란?

### 핵심 특징

#### 1. Hybrid Markdown/WYSIWYG
```
입력하는 동안:
# Hello **world**
  ↓ (실시간 변환)
[큰 제목] Hello [굵은 글씨]world[/굵은 글씨]
```

#### 2. 선택적 문법 숨김
- **기본 모드**: `**bold**` → **bold** (문법 기호 보임)
- **Hide Markdown**: `**bold**` → **bold** (문법 기호 숨김)
- 포커스된 줄은 항상 문법 표시

#### 3. 스마트 변환
- 입력하는 즉시 리치 텍스트로 변환
- 링크, 체크박스, 코드 블록 자동 변환
- 다시 편집하면 일반 텍스트로 복원

---

## 💡 구현 전략: "가짜 Bear" (Fake Bear)

### 왜 "가짜 Bear"인가?

Bear는 iOS/macOS 네이티브 앱이므로 `UITextView` + `NSTextStorage`를 사용합니다.
웹에서 완벽하게 재현하려면 매우 복잡하므로, **실용적인 절충안**을 선택합니다.

### 핵심 아이디어

**ContentEditable + CSS로 문법 기호 숨기기**
- 실제로는 마크다운 텍스트를 직접 편집
- CSS로 문법 기호(`**`, `#`, `[]` 등)를 시각적으로 숨김
- 커서 관리는 간단 (일반 텍스트 편집과 동일)
- **난이도**: ⭐⭐⭐
- **개발 시간**: 10-15시간

```html
<!-- 실제 데이터 (사용자는 이걸 편집) -->
<div contenteditable="true">
  <span class="md-heading-syntax">#</span>
  <span class="md-heading-text">Hello</span>
  <span class="md-bold-syntax">**</span>
  <span class="md-bold-text">world</span>
  <span class="md-bold-syntax">**</span>
</div>
```

```css
/* Hide Markdown 모드일 때 */
.hide-markdown .md-heading-syntax,
.hide-markdown .md-bold-syntax {
  font-size: 0;
  width: 0;
  display: inline; /* 커서 위치 유지를 위해 display:none은 안됨 */
}

/* 현재 줄(포커스된 줄)은 항상 문법 표시 */
.hide-markdown .current-line .md-heading-syntax,
.hide-markdown .current-line .md-bold-syntax {
  font-size: inherit;
  width: auto;
}
```

### 장점
- 충분히 Bear 느낌
- 합리적인 난이도
- 완전한 제어
- 의존성 최소화

### 단점
- 브라우저마다 contentEditable 동작 차이
- 복잡한 HTML 구조에서 커서 위치 추적 어려움
- Undo/Redo 직접 구현 필요

---

## 📦 1단계: 패키지 설치

### 필수 패키지

```bash
npm install marked dompurify
npm install @types/dompurify --save-dev
```

**설치 내용**:
- `marked`: 빠르고 간단한 마크다운 파서
- `dompurify`: HTML 새니타이제이션 (XSS 방어)

### 선택 패키지 (나중에 추가 가능)

```bash
# 구문 강조 (코드 블록)
npm install highlight.js

# 테이블, 체크박스 등 GitHub Flavored Markdown
npm install marked-gfm-heading-id marked-extended-tables

# Tailwind 타이포그래피 (마크다운 스타일링)
npm install @tailwindcss/typography
```

---

## 🛠️ 2단계: Tailwind 설정 (선택사항)

**`tailwind.config.js` 수정**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./renderer/**/*.{html,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),  // 추가 (설치한 경우)
  ],
}
```

---

## ⚛️ 3단계: 마크다운 파서 유틸리티 구현

### 3.1 토큰 파서 생성

**`renderer/src/utils/markdownRenderer.ts`** (새 파일)

```typescript
// 마크다운 토큰 타입 정의
interface MarkdownToken {
  type: 'text' | 'syntax'
  content: string
  style?: 'bold' | 'italic' | 'code' | 'heading' | 'heading1' | 'heading2' | 'heading3'
  level?: number  // heading level (1-6)
}

/**
 * 마크다운 텍스트를 토큰으로 파싱
 * 각 토큰은 문법 기호(syntax) 또는 실제 내용(text)으로 구분
 */
export function parseMarkdownToTokens(markdown: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = []
  const lines = markdown.split('\n')

  lines.forEach((line, lineIndex) => {
    // 줄 시작 부분 처리
    let currentPos = 0
    let remaining = line

    // 1. Heading 처리: # Heading
    const headingMatch = remaining.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const [, hashes, content] = headingMatch
      const level = hashes.length

      tokens.push({
        type: 'syntax',
        content: hashes + ' ',
        style: `heading${level}` as any,
        level
      })

      // content 부분도 인라인 스타일 적용 필요
      const contentTokens = parseInlineMarkdown(content, `heading${level}` as any)
      tokens.push(...contentTokens)

      tokens.push({ type: 'text', content: '\n' })
      return
    }

    // 2. 인라인 마크다운 처리 (Bold, Italic, Code)
    const inlineTokens = parseInlineMarkdown(remaining)
    tokens.push(...inlineTokens)

    // 줄바꿈 추가 (마지막 줄 제외)
    if (lineIndex < lines.length - 1) {
      tokens.push({ type: 'text', content: '\n' })
    }
  })

  return tokens
}

/**
 * 인라인 마크다운 파싱 (Bold, Italic, Code)
 */
function parseInlineMarkdown(text: string, inheritStyle?: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = []
  let remaining = text
  let lastIndex = 0

  // 패턴 우선순위: Bold > Italic > Code
  const patterns = [
    { regex: /(\*\*|__)([^*_]+)(\*\*|__)/g, style: 'bold' as const },
    { regex: /(\*|_)([^*_]+)(\*|_)/g, style: 'italic' as const },
    { regex: /(`)([^`]+)(`)/g, style: 'code' as const },
  ]

  // 모든 매치를 찾아서 위치순으로 정렬
  const allMatches: Array<{
    index: number
    length: number
    syntax1: string
    content: string
    syntax2: string
    style: 'bold' | 'italic' | 'code'
  }> = []

  patterns.forEach(({ regex, style }) => {
    let match
    regex.lastIndex = 0  // 정규식 초기화
    while ((match = regex.exec(remaining)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        syntax1: match[1],
        content: match[2],
        syntax2: match[3],
        style
      })
    }
  })

  // 위치순 정렬 (먼저 나오는 것 우선)
  allMatches.sort((a, b) => a.index - b.index)

  // 겹치는 매치 제거 (첫 번째 매치만 유지)
  const validMatches = []
  let prevEnd = 0
  for (const match of allMatches) {
    if (match.index >= prevEnd) {
      validMatches.push(match)
      prevEnd = match.index + match.length
    }
  }

  // 토큰 생성
  lastIndex = 0
  validMatches.forEach(({ index, syntax1, content, syntax2, style }) => {
    // 이전 텍스트
    if (index > lastIndex) {
      tokens.push({
        type: 'text',
        content: remaining.slice(lastIndex, index),
        style: inheritStyle as any
      })
    }

    // 문법 기호 1
    tokens.push({
      type: 'syntax',
      content: syntax1,
      style
    })

    // 실제 내용
    tokens.push({
      type: 'text',
      content: content,
      style
    })

    // 문법 기호 2
    tokens.push({
      type: 'syntax',
      content: syntax2,
      style
    })

    lastIndex = index + syntax1.length + content.length + syntax2.length
  })

  // 남은 텍스트
  if (lastIndex < remaining.length) {
    tokens.push({
      type: 'text',
      content: remaining.slice(lastIndex),
      style: inheritStyle as any
    })
  }

  // 아무 매치도 없으면 전체를 텍스트로
  if (tokens.length === 0) {
    tokens.push({
      type: 'text',
      content: remaining,
      style: inheritStyle as any
    })
  }

  return tokens
}

/**
 * 토큰 배열을 HTML로 변환
 */
export function tokensToHTML(tokens: MarkdownToken[]): string {
  return tokens.map(token => {
    const styleClass = token.style ? `md-${token.style}` : ''
    const typeClass = token.type === 'syntax' ? 'md-syntax' : 'md-text'

    // 줄바꿈 처리
    if (token.content === '\n') {
      return '<br>'
    }

    return `<span class="${typeClass} ${styleClass}" data-type="${token.type}">${escapeHtml(token.content)}</span>`
  }).join('')
}

/**
 * HTML 이스케이프 (XSS 방어)
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

---

## 🎨 4단계: Bear 스타일 에디터 컴포넌트

**`renderer/src/components/BearStyleEditor.tsx`** (새 파일)

```tsx
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { parseMarkdownToTokens, tokensToHTML } from '../utils/markdownRenderer'

interface BearStyleEditorProps {
  content: string
  onChange: (content: string) => void
  hideMarkdown?: boolean
}

export default function BearStyleEditor({
  content,
  onChange,
  hideMarkdown = false
}: BearStyleEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [currentLine, setCurrentLine] = useState<number>(0)
  const isUpdatingRef = useRef(false)

  // 마크다운 → 토큰 → HTML 변환
  useEffect(() => {
    if (!editorRef.current || isUpdatingRef.current) return

    const tokens = parseMarkdownToTokens(content)
    const html = tokensToHTML(tokens)

    if (editorRef.current.innerHTML !== html) {
      const cursorPos = saveCursorPosition()
      editorRef.current.innerHTML = html
      if (cursorPos !== null) {
        restoreCursorPosition(cursorPos)
      }
    }
  }, [content])

  // 입력 이벤트 처리
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current) return

    isUpdatingRef.current = true

    // HTML에서 순수 텍스트 추출 (마크다운 문법 포함)
    const plainText = extractPlainText(editorRef.current)

    onChange(plainText)

    // 현재 라인 추적
    updateCurrentLine()

    isUpdatingRef.current = false
  }, [onChange])

  // 커서가 있는 현재 라인 찾기
  const updateCurrentLine = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !selection.anchorNode) return

    const cursorOffset = saveCursorPosition()
    if (cursorOffset !== null && editorRef.current) {
      const textBeforeCursor = editorRef.current.innerText.slice(0, cursorOffset)
      const lineNumber = (textBeforeCursor.match(/\n/g) || []).length
      setCurrentLine(lineNumber)
    }
  }, [])

  // 클릭, 키 입력 시 현재 라인 업데이트
  const handleClick = useCallback(() => {
    updateCurrentLine()
  }, [updateCurrentLine])

  const handleKeyUp = useCallback(() => {
    updateCurrentLine()
  }, [updateCurrentLine])

  // HTML에서 순수 텍스트 추출
  function extractPlainText(element: HTMLElement): string {
    let text = ''

    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.tagName === 'BR') {
          text += '\n'
        } else {
          text += extractPlainText(el)
        }
      }
    })

    return text
  }

  // 커서 위치 저장
  function saveCursorPosition(): number | null {
    const selection = window.getSelection()
    if (!selection || !selection.anchorNode || !editorRef.current) return null

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editorRef.current)
    preCaretRange.setEnd(range.endContainer, range.endOffset)

    return preCaretRange.toString().length
  }

  // 커서 위치 복원
  function restoreCursorPosition(position: number) {
    if (!editorRef.current) return

    const selection = window.getSelection()
    const range = document.createRange()

    let currentPos = 0
    let found = false

    function traverse(node: Node) {
      if (found) return

      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0
        if (currentPos + textLength >= position) {
          range.setStart(node, Math.min(position - currentPos, textLength))
          range.collapse(true)
          found = true
          return
        }
        currentPos += textLength
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i])
        }
      }
    }

    traverse(editorRef.current)

    if (found && selection) {
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  return (
    <div className="bear-editor-container w-full h-full">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        className={[
          'bear-editor',
          'w-full h-full p-4 overflow-auto',
          'focus:outline-none',
          'font-sans text-base',
          hideMarkdown ? 'hide-markdown' : ''
        ].join(' ')}
        data-current-line={currentLine}
        suppressContentEditableWarning
      />
    </div>
  )
}
```

---

## 🎨 5단계: CSS 스타일링

**`renderer/src/styles/bear-editor.css`** (새 파일)

```css
/* 기본 에디터 스타일 */
.bear-editor {
  line-height: 1.6;
  color: #333;
  background: #fff;
}

.dark .bear-editor {
  color: #e0e0e0;
  background: #1e1e1e;
}

/* 마크다운 문법 기호 스타일 */
.md-syntax {
  color: #999;
  user-select: none;
  transition: opacity 0.2s ease;
}

/* 텍스트 스타일 */
.md-text.md-bold {
  font-weight: bold;
}

.md-text.md-italic {
  font-style: italic;
}

.md-text.md-code {
  font-family: 'Courier New', monospace;
  background: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.dark .md-text.md-code {
  background: #2d2d2d;
  color: #e06c75;
}

/* Heading 스타일 */
.md-text.md-heading1,
.md-syntax.md-heading1 {
  font-weight: bold;
  font-size: 2em;
  line-height: 1.2;
}

.md-text.md-heading2,
.md-syntax.md-heading2 {
  font-weight: bold;
  font-size: 1.5em;
  line-height: 1.3;
}

.md-text.md-heading3,
.md-syntax.md-heading3 {
  font-weight: bold;
  font-size: 1.25em;
  line-height: 1.4;
}

/* Hide Markdown 모드 - 문법 기호 숨기기 */
.bear-editor.hide-markdown .md-syntax {
  /* display: none은 커서 위치가 깨져서 사용 불가 */
  font-size: 0;
  width: 0;
  opacity: 0;
  pointer-events: none;
}

/* 현재 줄은 항상 문법 표시 */
.bear-editor.hide-markdown .current-line .md-syntax {
  font-size: inherit;
  width: auto;
  opacity: 1;
}

/* 현재 줄 하이라이트 (선택사항) */
.bear-editor .current-line {
  background: rgba(0, 0, 0, 0.02);
}

.dark .bear-editor .current-line {
  background: rgba(255, 255, 255, 0.05);
}

/* 포커스 스타일 */
.bear-editor:focus {
  outline: none;
}

/* 선택 영역 스타일 */
.bear-editor ::selection {
  background: rgba(100, 149, 237, 0.3);
}

.dark .bear-editor ::selection {
  background: rgba(100, 149, 237, 0.4);
}
```

**`renderer/src/index.css`에 import 추가**

```css
@import './styles/bear-editor.css';
```

---

## 🔧 6단계: App.tsx 통합

**`renderer/src/App.tsx` 수정**

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import BearStyleEditor from './components/BearStyleEditor'

type FileResult = { content: string; path: string | null } | null

export default function App() {
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const [content, setContent] = useState('')
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [active, setActive] = useState(true)
  const [hideMarkdown, setHideMarkdown] = useState(false)

  // Title and status text
  const fileName = useMemo(() => (currentPath ? currentPath.split(/[\\/]/).pop()! : 'Untitled'), [currentPath])

  useEffect(() => {
    document.title = `${fileName}${dirty ? ' *' : ''} — Memo`
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
    if (y <= 60) {  // 툴바 영역
      showToolbar()
      return
    }
    const el = toolbarRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom + 10) {
        return
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

  function handleContentChange(newContent: string) {
    setContent(newContent)
    setDirty(true)
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
      >
        {/* Traffic lights */}
        <div className="px-3 flex items-center justify-between relative bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700" style={{ height: '28px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '6px' }}>
          <div className="flex items-center gap-[8px] -webkit-app-region-no-drag select-none pl-[2px]">
            <button
              title="Close"
              onClick={() => (window as any).api?.windowControls?.close?.()}
              className={[
                'traffic-btn relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition aspect-square border-0',
                active ? 'opacity-100' : 'opacity-75'
              ].join(' ')}
              style={{ backgroundColor: '#ff5f57', border: 'none', outline: 'none' }}
              aria-label="Close"
            />
            <button
              title="Minimize"
              onClick={() => (window as any).api?.windowControls?.minimize?.()}
              className={[
                'traffic-btn relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition aspect-square border-0',
                active ? 'opacity-100' : 'opacity-75'
              ].join(' ')}
              style={{ backgroundColor: '#febc2e', border: 'none', outline: 'none' }}
              aria-label="Minimize"
            />
            <button
              title={maximized ? 'Restore' : 'Maximize'}
              onClick={() => (window as any).api?.windowControls?.maximizeOrRestore?.()}
              className={[
                'traffic-btn relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-full transition aspect-square border-0',
                active ? 'opacity-100' : 'opacity-75'
              ].join(' ')}
              style={{ backgroundColor: '#28c840', border: 'none', outline: 'none' }}
              aria-label={maximized ? 'Restore' : 'Maximize'}
            />
          </div>

          {/* Hide Markdown 토글 */}
          <button
            onClick={() => setHideMarkdown(!hideMarkdown)}
            className="px-3 py-1 text-xs rounded -webkit-app-region-no-drag bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            title={hideMarkdown ? 'Show Markdown Syntax' : 'Hide Markdown Syntax'}
          >
            {hideMarkdown ? 'Show Markdown' : 'Hide Markdown'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="fixed inset-0 overflow-auto pt-0">
        <BearStyleEditor
          content={content}
          onChange={handleContentChange}
          hideMarkdown={hideMarkdown}
        />
      </div>
    </div>
  )
}
```

---

## ✅ 7단계: 테스트 체크리스트

구현 후 다음 항목들을 테스트하세요:

### 기본 마크다운
- [ ] 제목 (H1, H2, H3: `#`, `##`, `###`)
- [ ] 굵게 (`**bold**`, `__bold__`)
- [ ] 기울임 (`*italic*`, `_italic_`)
- [ ] 인라인 코드 (`` `code` ``)

### Hide Markdown 모드
- [ ] Hide Markdown 토글 버튼 동작
- [ ] 문법 기호가 숨겨지는지 확인
- [ ] 현재 줄(포커스된 줄)에서는 문법 표시
- [ ] 다른 줄로 이동 시 이전 줄 문법 숨김

### 편집 기능
- [ ] 일반 텍스트 입력
- [ ] 마크다운 문법 입력 (실시간 스타일 적용)
- [ ] 커서 이동 (방향키, 마우스 클릭)
- [ ] 텍스트 선택 및 삭제
- [ ] 복사/붙여넣기
- [ ] Undo/Redo (브라우저 기본 기능)

### 파일 I/O
- [ ] 파일 열기
- [ ] 파일 저장
- [ ] 다른 이름으로 저장
- [ ] Dirty state 추적 (수정 시 `*` 표시)

### 스타일
- [ ] 라이트 모드 스타일링
- [ ] 다크 모드 스타일링
- [ ] 툴바 자동 숨김/표시

---

## 🚀 8단계: 빌드 및 실행

### 개발 모드 실행

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm start
```

---

## 📝 9단계: 추가 개선 사항 (선택사항)

### 9.1 추가 마크다운 문법 지원

현재 구현은 기본 문법만 지원합니다. 추가할 수 있는 기능:

- [ ] 불릿 목록 (`-`, `*`, `+`)
- [ ] 번호 목록 (`1.`, `2.`)
- [ ] 링크 (`[text](url)`)
- [ ] 이미지 (`![alt](url)`)
- [ ] 인용 (`> quote`)
- [ ] 수평선 (`---`, `***`)
- [ ] 체크박스 (`- [ ]`, `- [x]`)
- [ ] 테이블

### 9.2 마크다운 툴바

```tsx
// 굵게, 기울임, 링크 삽입 버튼 추가
<div className="markdown-toolbar">
  <button onClick={insertBold}>B</button>
  <button onClick={insertItalic}>I</button>
  <button onClick={insertCode}>Code</button>
  <button onClick={insertLink}>Link</button>
</div>
```

### 9.3 키보드 단축키

```tsx
// Cmd+B: 굵게
// Cmd+I: 기울임
// Cmd+K: 링크 삽입
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault()
      insertBold()
    }
    // ... 기타 단축키
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

### 9.4 HTML/PDF 내보내기

```bash
npm install jspdf html2canvas
npm install @types/jspdf --save-dev
```

```tsx
// HTML 내보내기
function exportHTML() {
  const html = editorRef.current?.innerHTML
  // 파일로 저장
}

// PDF 내보내기
async function exportPDF() {
  const element = editorRef.current
  if (!element) return

  const canvas = await html2canvas(element)
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF()
  pdf.addImage(imgData, 'PNG', 0, 0)
  pdf.save('document.pdf')
}
```

### 9.5 자동 저장

```tsx
useEffect(() => {
  if (!dirty) return

  const timer = setTimeout(() => {
    handleSave()
  }, 5000) // 5초 후 자동 저장

  return () => clearTimeout(timer)
}, [content, dirty])
```

---

## ⚠️ 주의사항 및 제한사항

### 1. contentEditable의 한계
- 브라우저마다 동작이 다를 수 있음
- 복잡한 HTML 구조에서 커서 위치 추적 어려움
- 기본 Undo/Redo 기능은 브라우저에 의존

### 2. 성능 문제
- 긴 문서에서 innerHTML 업데이트는 느릴 수 있음
- 변경된 부분만 업데이트하는 최적화 필요
- Virtual DOM diffing 또는 debouncing 고려

### 3. 엣지 케이스
- 줄바꿈 처리 (`\n` vs `<br>`)
- 빈 줄 처리
- 중첩된 마크다운 (예: `**bold *italic***`)
- 이스케이프 문자 (`\*`는 문법이 아님)
- IME 입력 (한글, 일본어, 중국어)

### 4. Bear와의 차이점
- Bear는 네이티브 앱이므로 더 정교한 텍스트 렌더링
- 완벽한 커서 관리 및 텍스트 선택
- 웹 버전은 브라우저 제약 있음

---

## 🎯 최종 정리

### 예상 작업 시간

- **패키지 설치**: 10분
- **마크다운 파서 구현**: 2-3시간
- **Bear 에디터 컴포넌트**: 3-4시간
- **CSS 스타일링**: 1-2시간
- **App.tsx 통합**: 1시간
- **테스트 및 버그 수정**: 2-3시간

**총 예상 시간**: 10-15시간

### 파일 크기 증가

- 번들 크기: 약 100-200KB (gzipped: ~50KB)
- marked: ~40KB
- dompurify: ~30KB
- 커스텀 코드: ~30KB

### 구현 순서 권장

1. ✅ 패키지 설치
2. ✅ Tailwind 설정 수정 (선택)
3. ✅ 마크다운 파서 구현 (`markdownRenderer.ts`)
4. ✅ Bear 에디터 컴포넌트 구현 (`BearStyleEditor.tsx`)
5. ✅ CSS 스타일링 (`bear-editor.css`)
6. ✅ App.tsx에 통합
7. ✅ 테스트 및 디버깅

---

## 📚 참고 자료

- [Bear Blog - Why Bear is built on Markdown](https://blog.bear.app/2023/11/why-bear-is-built-on-markdown-and-what-that-means/)
- [Panda Editor Sneak Peek](https://community.bear.app/t/panda-sneak-peek-a-work-in-progress-markdown-editor-and-library/12332)
- [iOS Text Kit Basics](https://thoughtbot.com/blog/ios-text-kit-basics)
- [ContentEditable 가이드](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)
- [Marked 문서](https://marked.js.org/)
- [DOMPurify 문서](https://github.com/cure53/DOMPurify)

---

## 🎉 완성 예상 결과

- ✅ Bear 앱처럼 Hybrid Live Editor
- ✅ 마크다운 입력 시 실시간 스타일 적용
- ✅ Hide Markdown 모드 (문법 기호 숨김)
- ✅ 현재 줄에서는 항상 문법 표시
- ✅ 다크 모드 지원
- ✅ 기존 파일 I/O 기능 유지
- ✅ 최소한의 의존성
- ✅ 합리적인 개발 시간

---

## 🚦 빠른 시작

```bash
# 1. 패키지 설치
npm install marked dompurify
npm install @types/dompurify --save-dev

# 2. 파일 생성
# - renderer/src/utils/markdownRenderer.ts
# - renderer/src/components/BearStyleEditor.tsx
# - renderer/src/styles/bear-editor.css

# 3. App.tsx 수정
# - BearStyleEditor 컴포넌트 import 및 사용
# - Hide Markdown 토글 버튼 추가

# 4. CSS import 추가
# - renderer/src/index.css에 bear-editor.css import

# 5. 실행
npm run dev
```

이제 Bear 스타일 에디터를 구현할 준비가 되었습니다!
