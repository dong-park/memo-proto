# Memo-Proto Bear 스타일 에디터 구현 TODO

## Phase 0: 프로젝트 준비 및 환경 설정

### 0.1 패키지 설치
- [ ] `marked` 패키지 설치 (마크다운 파서)
- [ ] `dompurify` 패키지 설치 (HTML 새니타이제이션)
- [ ] `@types/dompurify` dev 패키지 설치

### 0.2 추가 패키지 설치 (선택사항)
- [ ] `@tailwindcss/typography` 설치 (마크다운 스타일링)
- [ ] `highlight.js` 설치 (코드 블록 하이라이트)

### 0.3 Tailwind 설정 업데이트
- [ ] `tailwind.config.js` 파일 열기
- [ ] `content` 배열에 renderer 경로 포함 확인
- [ ] `@tailwindcss/typography` 플러그인 추가 (설치한 경우)

---

## Phase 1: 마크다운 파서 유틸리티 구현

### 1.1 기본 파일 구조 생성
- [ ] `renderer/src/utils` 디렉토리 생성 (없는 경우)
- [ ] `renderer/src/utils/markdownRenderer.ts` 파일 생성

### 1.2 타입 정의
- [ ] `MarkdownToken` 인터페이스 정의
  - [ ] `type` 속성 추가 (`'text' | 'syntax'`)
  - [ ] `content` 속성 추가 (string)
  - [ ] `style` 속성 추가 (optional, 스타일 타입들)
  - [ ] `level` 속성 추가 (optional, heading level)

### 1.3 유틸리티 함수 - escapeHtml
- [ ] `escapeHtml` 함수 생성
- [ ] DOM createElement로 div 생성
- [ ] textContent 설정하여 이스케이프
- [ ] innerHTML 반환

### 1.4 인라인 마크다운 파서 구현 - parseInlineMarkdown
- [ ] `parseInlineMarkdown` 함수 기본 구조 생성
- [ ] 함수 파라미터 정의 (`text: string`, `inheritStyle?: string`)
- [ ] 패턴 배열 정의
  - [ ] Bold 패턴 추가 (`**` 또는 `__`)
  - [ ] Italic 패턴 추가 (`*` 또는 `_`)
  - [ ] Code 패턴 추가 (백틱)
- [ ] 모든 매치 찾기 로직 구현
- [ ] 매치 위치순 정렬 로직 구현
- [ ] 겹치는 매치 제거 로직 구현
- [ ] 토큰 생성 로직 구현
  - [ ] 이전 텍스트 토큰 추가
  - [ ] 문법 기호 토큰 추가
  - [ ] 실제 내용 토큰 추가
  - [ ] 닫는 문법 기호 토큰 추가
- [ ] 남은 텍스트 처리
- [ ] 빈 토큰 배열 처리 (기본 텍스트 반환)

### 1.5 메인 마크다운 파서 구현 - parseMarkdownToTokens
- [ ] `parseMarkdownToTokens` 함수 기본 구조 생성
- [ ] 파라미터 정의 (`markdown: string`)
- [ ] 텍스트를 줄 단위로 분리 (`split('\n')`)
- [ ] Heading 처리 로직 구현
  - [ ] Heading 정규식 패턴 작성
  - [ ] 레벨 추출 (1-6)
  - [ ] 문법 기호 토큰 생성
  - [ ] 내용 부분에 인라인 스타일 적용
  - [ ] 줄바꿈 토큰 추가
- [ ] 일반 텍스트 라인 처리
  - [ ] `parseInlineMarkdown` 호출
  - [ ] 결과 토큰 배열에 추가
- [ ] 줄바꿈 토큰 처리 (마지막 줄 제외)
- [ ] 최종 토큰 배열 반환

### 1.6 HTML 변환 함수 - tokensToHTML
- [ ] `tokensToHTML` 함수 생성
- [ ] 파라미터 정의 (`tokens: MarkdownToken[]`)
- [ ] 각 토큰을 순회하며 HTML 생성
  - [ ] 스타일 클래스 생성 (`md-{style}`)
  - [ ] 타입 클래스 생성 (`md-syntax` or `md-text`)
  - [ ] 줄바꿈 처리 (`\n` → `<br>`)
  - [ ] span 태그 생성 (클래스, data-type 속성)
  - [ ] 내용 이스케이프 처리
- [ ] 최종 HTML 문자열 반환

### 1.7 단위 테스트 (수동)
- [ ] Bold 텍스트 파싱 테스트
- [ ] Italic 텍스트 파싱 테스트
- [ ] Code 텍스트 파싱 테스트
- [ ] Heading 파싱 테스트 (H1, H2, H3)
- [ ] 복합 텍스트 파싱 테스트 (Bold + Italic)

---

## Phase 2: Bear 스타일 에디터 컴포넌트 구현

### 2.1 기본 파일 구조 생성
- [ ] `renderer/src/components` 디렉토리 생성 (없는 경우)
- [ ] `renderer/src/components/BearStyleEditor.tsx` 파일 생성

### 2.2 컴포넌트 인터페이스 정의
- [ ] `BearStyleEditorProps` 인터페이스 생성
  - [ ] `content` 속성 (string)
  - [ ] `onChange` 속성 (함수)
  - [ ] `hideMarkdown` 속성 (optional boolean)

### 2.3 컴포넌트 기본 구조
- [ ] 함수형 컴포넌트 생성
- [ ] Props destructuring
- [ ] Ref 설정
  - [ ] `editorRef` 생성 (HTMLDivElement)
  - [ ] `isUpdatingRef` 생성 (boolean)
- [ ] State 설정
  - [ ] `currentLine` state 생성

### 2.4 마크다운 → HTML 변환 Effect
- [ ] useEffect 설정 (content 의존성)
- [ ] isUpdatingRef 체크
- [ ] 토큰 파싱 (`parseMarkdownToTokens`)
- [ ] HTML 생성 (`tokensToHTML`)
- [ ] 커서 위치 저장 로직
- [ ] innerHTML 업데이트
- [ ] 커서 위치 복원 로직

### 2.5 커서 위치 관리 함수
- [ ] `saveCursorPosition` 함수 구현
  - [ ] Selection 객체 가져오기
  - [ ] anchorNode 체크
  - [ ] Range 생성 및 복제
  - [ ] 커서 오프셋 계산
  - [ ] 오프셋 반환
- [ ] `restoreCursorPosition` 함수 구현
  - [ ] Selection 및 Range 객체 생성
  - [ ] 노드 순회 함수 작성
  - [ ] 텍스트 노드에서 위치 찾기
  - [ ] Range 설정
  - [ ] Selection에 Range 추가

### 2.6 텍스트 추출 함수
- [ ] `extractPlainText` 함수 구현
- [ ] 재귀적 노드 순회
- [ ] TEXT_NODE 처리
- [ ] BR 태그 처리 (줄바꿈)
- [ ] ELEMENT_NODE 재귀 처리
- [ ] 최종 텍스트 반환

### 2.7 현재 라인 추적
- [ ] `updateCurrentLine` 함수 구현
- [ ] Selection에서 커서 위치 가져오기
- [ ] 커서 이전 텍스트에서 줄바꿈 개수 세기
- [ ] currentLine state 업데이트

### 2.8 이벤트 핸들러
- [ ] `handleInput` 구현
  - [ ] isUpdatingRef 플래그 설정
  - [ ] plainText 추출
  - [ ] onChange 콜백 호출
  - [ ] updateCurrentLine 호출
  - [ ] isUpdatingRef 플래그 해제
- [ ] `handleClick` 구현
  - [ ] updateCurrentLine 호출
- [ ] `handleKeyUp` 구현
  - [ ] updateCurrentLine 호출

### 2.9 JSX 렌더링
- [ ] 컨테이너 div 작성
- [ ] contentEditable div 작성
  - [ ] ref 연결
  - [ ] contentEditable 속성
  - [ ] 이벤트 핸들러 연결 (onInput, onClick, onKeyUp)
  - [ ] className 조건부 설정
  - [ ] data-current-line 속성
  - [ ] suppressContentEditableWarning 추가

---

## Phase 3: CSS 스타일링

### 3.1 CSS 파일 생성
- [ ] `renderer/src/styles` 디렉토리 생성 (없는 경우)
- [ ] `renderer/src/styles/bear-editor.css` 파일 생성

### 3.2 기본 에디터 스타일
- [ ] `.bear-editor` 클래스 스타일
  - [ ] line-height 설정
  - [ ] color 설정 (라이트 모드)
  - [ ] background 설정 (라이트 모드)
- [ ] `.dark .bear-editor` 스타일 (다크 모드)
  - [ ] color 설정
  - [ ] background 설정

### 3.3 마크다운 문법 기호 스타일
- [ ] `.md-syntax` 클래스
  - [ ] color 설정 (회색)
  - [ ] user-select: none
  - [ ] transition 효과

### 3.4 텍스트 스타일
- [ ] `.md-text.md-bold` 스타일
  - [ ] font-weight: bold
- [ ] `.md-text.md-italic` 스타일
  - [ ] font-style: italic
- [ ] `.md-text.md-code` 스타일
  - [ ] font-family 설정 (monospace)
  - [ ] background 설정
  - [ ] padding 설정
  - [ ] border-radius 설정
  - [ ] font-size 설정
- [ ] `.dark .md-text.md-code` 다크 모드 스타일

### 3.5 Heading 스타일
- [ ] `.md-text.md-heading1`, `.md-syntax.md-heading1` 스타일
  - [ ] font-weight: bold
  - [ ] font-size: 2em
  - [ ] line-height 설정
- [ ] `.md-text.md-heading2`, `.md-syntax.md-heading2` 스타일
  - [ ] font-weight: bold
  - [ ] font-size: 1.5em
  - [ ] line-height 설정
- [ ] `.md-text.md-heading3`, `.md-syntax.md-heading3` 스타일
  - [ ] font-weight: bold
  - [ ] font-size: 1.25em
  - [ ] line-height 설정

### 3.6 Hide Markdown 모드 스타일
- [ ] `.bear-editor.hide-markdown .md-syntax` 스타일
  - [ ] font-size: 0
  - [ ] width: 0
  - [ ] opacity: 0
  - [ ] pointer-events: none
- [ ] `.bear-editor.hide-markdown .current-line .md-syntax` 스타일
  - [ ] font-size: inherit
  - [ ] width: auto
  - [ ] opacity: 1

### 3.7 현재 줄 하이라이트
- [ ] `.bear-editor .current-line` 스타일
  - [ ] background 설정 (라이트 모드)
- [ ] `.dark .bear-editor .current-line` 스타일
  - [ ] background 설정 (다크 모드)

### 3.8 기타 스타일
- [ ] `.bear-editor:focus` 스타일
  - [ ] outline: none
- [ ] `.bear-editor ::selection` 스타일 (라이트 모드)
  - [ ] background 설정
- [ ] `.dark .bear-editor ::selection` 스타일 (다크 모드)
  - [ ] background 설정

### 3.9 CSS Import
- [ ] `renderer/src/index.css` 열기
- [ ] `@import './styles/bear-editor.css';` 추가

---

## Phase 4: App.tsx 통합

### 4.1 Import 추가
- [ ] `BearStyleEditor` 컴포넌트 import

### 4.2 State 추가
- [ ] `hideMarkdown` state 추가 (boolean, 기본값 false)

### 4.3 텍스트 에디터 교체
- [ ] 기존 `<textarea>` 코드 찾기
- [ ] `<BearStyleEditor>` 컴포넌트로 교체
  - [ ] content prop 전달
  - [ ] onChange prop 전달
  - [ ] hideMarkdown prop 전달

### 4.4 Hide Markdown 토글 버튼 추가
- [ ] 툴바 영역에 버튼 추가
- [ ] 버튼 클릭 핸들러 (hideMarkdown 토글)
- [ ] 버튼 텍스트 조건부 설정
- [ ] 버튼 스타일링 (Tailwind)
- [ ] `-webkit-app-region-no-drag` 클래스 추가

---

## Phase 5: 기본 기능 테스트

### 5.1 개발 서버 실행
- [ ] `npm run dev` 실행
- [ ] 앱이 정상적으로 열리는지 확인

### 5.2 기본 마크다운 테스트
- [ ] H1 제목 입력 (`# Heading 1`)
  - [ ] 스타일 적용 확인 (큰 글씨, 굵게)
  - [ ] 문법 기호 표시 확인
- [ ] H2 제목 입력 (`## Heading 2`)
  - [ ] 스타일 적용 확인
- [ ] H3 제목 입력 (`### Heading 3`)
  - [ ] 스타일 적용 확인
- [ ] Bold 텍스트 입력 (`**bold**`)
  - [ ] 굵은 글씨 확인
  - [ ] 문법 기호 표시 확인
- [ ] Italic 텍스트 입력 (`*italic*`)
  - [ ] 기울임 글씨 확인
  - [ ] 문법 기호 표시 확인
- [ ] Inline Code 입력 (`` `code` ``)
  - [ ] monospace 폰트 확인
  - [ ] 배경색 확인
  - [ ] 문법 기호 표시 확인

### 5.3 Hide Markdown 모드 테스트
- [ ] Hide Markdown 버튼 클릭
- [ ] 문법 기호가 숨겨지는지 확인
- [ ] 커서를 특정 줄로 이동
- [ ] 현재 줄에서 문법 기호가 다시 보이는지 확인
- [ ] 다른 줄로 이동
- [ ] 이전 줄의 문법 기호가 다시 숨겨지는지 확인
- [ ] Hide Markdown 버튼 다시 클릭 (끄기)
- [ ] 모든 문법 기호가 다시 보이는지 확인

### 5.4 편집 기능 테스트
- [ ] 일반 텍스트 입력 테스트
- [ ] 텍스트 삭제 (Backspace, Delete)
- [ ] 커서 이동 (화살표 키)
- [ ] 마우스 클릭으로 커서 이동
- [ ] 텍스트 선택 (드래그)
- [ ] 텍스트 복사 (Cmd+C / Ctrl+C)
- [ ] 텍스트 붙여넣기 (Cmd+V / Ctrl+V)
- [ ] Undo (Cmd+Z / Ctrl+Z)
- [ ] Redo (Cmd+Shift+Z / Ctrl+Shift+Z)

### 5.5 파일 I/O 테스트
- [ ] 파일 열기 (기존 마크다운 파일)
- [ ] 파일 내용 표시 확인
- [ ] 텍스트 수정
- [ ] Dirty state 확인 (타이틀에 `*` 표시)
- [ ] 파일 저장
- [ ] Dirty state 해제 확인
- [ ] 다른 이름으로 저장

### 5.6 UI/UX 테스트
- [ ] 툴바 자동 숨김 확인
- [ ] 상단 호버 시 툴바 표시 확인
- [ ] 다크 모드 전환 (시스템 설정)
- [ ] 다크 모드에서 색상 확인

---

## Phase 6: 버그 수정 및 최적화

### 6.1 커서 위치 버그 수정
- [ ] 커서 위치 저장/복원 로직 테스트
- [ ] 복잡한 문서에서 커서 이동 테스트
- [ ] 줄바꿈 처리 버그 확인
- [ ] 빈 줄 처리 버그 확인

### 6.2 성능 최적화
- [ ] 긴 문서 (1000줄 이상) 성능 테스트
- [ ] innerHTML 업데이트 최적화 검토
- [ ] debouncing 추가 검토
- [ ] 메모리 누수 확인

### 6.3 엣지 케이스 처리
- [ ] 중첩된 마크다운 테스트 (`**bold *italic***`)
- [ ] 이스케이프 문자 테스트 (`\*` 는 문법 아님)
- [ ] 한글 입력 테스트 (IME)
- [ ] 이모지 입력 테스트
- [ ] 특수 문자 입력 테스트

### 6.4 브라우저 호환성
- [ ] contentEditable 동작 확인 (Electron 환경)
- [ ] 복사/붙여넣기 동작 확인
- [ ] Undo/Redo 동작 확인

---

## Phase 7: 추가 마크다운 문법 지원 (선택사항)

### 7.1 불릿 목록 지원
- [ ] `markdownRenderer.ts`에 목록 파싱 로직 추가
- [ ] `-`, `*`, `+` 기호 인식
- [ ] 들여쓰기 처리
- [ ] CSS 스타일 추가

### 7.2 번호 목록 지원
- [ ] 번호 목록 파싱 로직 추가 (`1.`, `2.` 등)
- [ ] 들여쓰기 처리
- [ ] CSS 스타일 추가

### 7.3 링크 지원
- [ ] 링크 파싱 로직 추가 (`[text](url)`)
- [ ] 클릭 시 링크 열기 기능
- [ ] CSS 스타일 추가 (밑줄, 색상)

### 7.4 이미지 지원
- [ ] 이미지 파싱 로직 추가 (`![alt](url)`)
- [ ] 이미지 렌더링
- [ ] CSS 스타일 추가

### 7.5 인용 지원
- [ ] 인용 파싱 로직 추가 (`> quote`)
- [ ] CSS 스타일 추가 (왼쪽 보더, 들여쓰기)

### 7.6 수평선 지원
- [ ] 수평선 파싱 로직 추가 (`---`, `***`)
- [ ] CSS 스타일 추가

### 7.7 체크박스 지원
- [ ] 체크박스 파싱 로직 추가 (`- [ ]`, `- [x]`)
- [ ] 체크박스 토글 기능
- [ ] CSS 스타일 추가

### 7.8 테이블 지원
- [ ] 테이블 파싱 로직 추가
- [ ] 테이블 렌더링
- [ ] CSS 스타일 추가

---

## Phase 8: 고급 기능 추가 (선택사항)

### 8.1 마크다운 툴바
- [ ] 툴바 컴포넌트 생성
- [ ] Bold 버튼 추가 (선택 영역을 `**`로 감싸기)
- [ ] Italic 버튼 추가
- [ ] Code 버튼 추가
- [ ] Link 버튼 추가 (URL 입력 모달)
- [ ] Heading 버튼 추가 (드롭다운)
- [ ] 툴바 스타일링

### 8.2 키보드 단축키
- [ ] Cmd+B / Ctrl+B: Bold
- [ ] Cmd+I / Ctrl+I: Italic
- [ ] Cmd+K / Ctrl+K: Link 삽입
- [ ] Cmd+E / Ctrl+E: Inline Code
- [ ] Tab: 들여쓰기
- [ ] Shift+Tab: 내어쓰기

### 8.3 자동 저장
- [ ] 자동 저장 로직 추가
- [ ] 5초 타이머 설정
- [ ] dirty state 체크
- [ ] 자동 저장 실행
- [ ] 상태 표시 (저장 중, 저장 완료)

### 8.4 HTML 내보내기
- [ ] HTML 내보내기 메뉴 추가
- [ ] 에디터 HTML 추출
- [ ] HTML 파일로 저장
- [ ] 스타일시트 포함

### 8.5 PDF 내보내기
- [ ] `jspdf`, `html2canvas` 패키지 설치
- [ ] PDF 내보내기 메뉴 추가
- [ ] HTML을 Canvas로 변환
- [ ] Canvas를 PDF로 변환
- [ ] PDF 파일 저장

### 8.6 검색 및 바꾸기
- [ ] 검색 UI 추가 (Cmd+F)
- [ ] 검색 로직 구현
- [ ] 검색 결과 하이라이트
- [ ] 다음/이전 검색 결과 이동
- [ ] 바꾸기 기능
- [ ] 모두 바꾸기 기능

### 8.7 단어 수 카운터
- [ ] 단어 수 계산 로직
- [ ] 문자 수 계산
- [ ] 상태 바에 표시

---

## Phase 9: 테스트 및 문서화

### 9.1 종합 테스트
- [ ] 모든 마크다운 문법 테스트
- [ ] 모든 키보드 단축키 테스트
- [ ] 긴 문서 성능 테스트
- [ ] 메모리 사용량 테스트

### 9.2 사용자 시나리오 테스트
- [ ] 일반적인 노트 작성 시나리오
- [ ] 코드 스니펫 작성 시나리오
- [ ] 긴 문서 작성 시나리오
- [ ] 복사/붙여넣기 시나리오

### 9.3 버그 리포트 작성
- [ ] 발견된 버그 목록 작성
- [ ] 우선순위 설정
- [ ] 버그 수정 계획

### 9.4 README 업데이트
- [ ] 새로운 기능 설명 추가
- [ ] 사용법 가이드 추가
- [ ] 스크린샷 추가
- [ ] 키보드 단축키 목록

### 9.5 CHANGELOG 작성
- [ ] 버전 번호 결정
- [ ] 변경사항 목록 작성
- [ ] 릴리스 노트 작성

---

## Phase 10: 프로덕션 빌드 및 배포

### 10.1 프로덕션 빌드
- [ ] `npm run build` 실행
- [ ] 빌드 오류 확인 및 수정
- [ ] 번들 크기 확인
- [ ] 최적화 옵션 검토

### 10.2 배포 준비
- [ ] 앱 아이콘 설정
- [ ] 앱 메타데이터 설정
- [ ] 코드 서명 설정 (macOS)
- [ ] 앱 공증 설정 (macOS)

### 10.3 테스트 배포
- [ ] 테스트 빌드 생성
- [ ] 실제 환경에서 테스트
- [ ] 피드백 수집
- [ ] 버그 수정

### 10.4 최종 배포
- [ ] 최종 빌드 생성
- [ ] 릴리스 패키지 생성
- [ ] 배포 (앱스토어, 웹사이트 등)
- [ ] 릴리스 공지

---

## 예상 작업 시간

- **Phase 0-2**: 4-6시간 (핵심 로직)
- **Phase 3-4**: 2-3시간 (스타일 및 통합)
- **Phase 5**: 2-3시간 (기본 테스트)
- **Phase 6**: 2-3시간 (버그 수정)
- **Phase 7**: 3-5시간 (추가 마크다운 문법)
- **Phase 8**: 5-8시간 (고급 기능)
- **Phase 9**: 2-3시간 (테스트 및 문서화)
- **Phase 10**: 2-3시간 (빌드 및 배포)

**총 예상 시간**: 22-34시간

---

## 우선순위

### 필수 (P0)
- Phase 0-6: 기본 Bear 스타일 에디터 구현 및 테스트

### 권장 (P1)
- Phase 7: 추가 마크다운 문법 지원

### 선택 (P2)
- Phase 8: 고급 기능 추가

### 마무리 (P3)
- Phase 9-10: 테스트, 문서화, 배포

