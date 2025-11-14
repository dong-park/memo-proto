# memo-proto

Electron 기반 텍스트 에디터 프로토타입

## 현재 상태

기본적인 텍스트 편집 기능은 작동함. macOS 환경에서만 테스트했고 프레임리스 윈도우로 만들어서 네이티브 느낌 나도록 작업 중.

완료된 것:
- 파일 열기/저장/새로 만들기
- 커스텀 윈도우 컨트롤 (macOS 스타일 트래픽 라이트)
- 상단 툴바 자동 숨김 (마우스 올리면 나타남)
- 키보드 단축키 (Cmd+N, Cmd+O, Cmd+S 등)
- 수정 상태 추적

남은 것:
- Windows/Linux에서 제대로 작동하는지 확인 필요
- 자동 저장 기능
- 폰트 설정

## 프로젝트 구조

```
memo-proto/
├── main.js           # 메인 프로세스 (윈도우 관리, 파일 I/O, IPC)
├── preload.js        # 보안 브릿지
├── renderer/
│   ├── index.html
│   └── src/
│       ├── App.tsx   # 메인 컴포넌트
│       ├── main.tsx
│       └── index.css
└── vite.config.ts
```

## 사용 기술

- Electron 31 + React 18 + TypeScript
- Vite (빌드/개발서버)
- TailwindCSS 4

## 주요 특징

- 프레임리스 윈도우 (네이티브 타이틀바 없음)
- 마우스 올리면 나타나는 툴바 (평소엔 숨김)
- IPC 통신으로 메인↔렌더러 프로세스 분리

## 실행 방법

```bash
npm install
npm run dev  # 개발 모드
```

개발 모드로 실행하면 Vite 서버가 5173 포트에서 돌아가고 Electron 창이 뜸.

## 코드 구조

**main.js**
- 윈도우 생성/관리
- 파일 I/O 처리
- IPC 핸들러들 (`file:new`, `file:open`, `file:save`, 윈도우 컨트롤 등)

**App.tsx**
- React 컴포넌트
- 상태: content, currentPath, dirty, toolbarVisible 등
- 마우스 움직임으로 툴바 제어

**preload.js**
- contextBridge로 안전하게 API 노출

## 메모

- contextIsolation 켜져 있음 (보안)
- 배경색 검은색, 모노스페이스 폰트
- 툴바 페이드 애니메이션 200ms

## 추가 예정

나중에 추가하고 싶은 것들:
- 라이트 모드
- 폰트 크기 조절
- 최근 파일
- 검색/바꾸기
- 탭 기능?

