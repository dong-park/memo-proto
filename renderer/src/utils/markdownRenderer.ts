// 마크다운 토큰 타입 정의
export interface MarkdownToken {
  type: 'text' | 'syntax';
  content: string;
  style?: 'bold' | 'italic' | 'code' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6';
  level?: number;
}

/**
 * HTML 이스케이프 함수
 * XSS 방지를 위해 특수 문자를 HTML 엔티티로 변환
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 인라인 마크다운 파서
 * Bold, Italic, Code 등의 인라인 스타일을 파싱
 */
export function parseInlineMarkdown(
  text: string,
  inheritStyle?: 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6'
): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  
  // 인라인 마크다운 패턴 정의
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, style: 'bold' as const, syntax: '**' },
    { regex: /__(.+?)__/g, style: 'bold' as const, syntax: '__' },
    { regex: /\*(.+?)\*/g, style: 'italic' as const, syntax: '*' },
    { regex: /_(.+?)_/g, style: 'italic' as const, syntax: '_' },
    { regex: /`(.+?)`/g, style: 'code' as const, syntax: '`' },
  ];

  // 모든 매치 찾기
  interface Match {
    start: number;
    end: number;
    style: 'bold' | 'italic' | 'code';
    syntax: string;
    content: string;
  }

  const matches: Match[] = [];
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        style: pattern.style,
        syntax: pattern.syntax,
        content: match[1],
      });
    }
  }

  // 매치를 위치순으로 정렬
  matches.sort((a, b) => a.start - b.start);

  // 겹치는 매치 제거 (먼저 나온 것 우선)
  const validMatches: Match[] = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      validMatches.push(match);
      lastEnd = match.end;
    }
  }

  // 토큰 생성
  let currentPos = 0;
  for (const match of validMatches) {
    // 이전 텍스트 추가
    if (currentPos < match.start) {
      const plainText = text.substring(currentPos, match.start);
      tokens.push({
        type: 'text',
        content: plainText,
        style: inheritStyle,
      });
    }

    // 문법 기호 토큰 (시작)
    tokens.push({
      type: 'syntax',
      content: match.syntax,
      style: inheritStyle,
    });

    // 실제 내용 토큰
    tokens.push({
      type: 'text',
      content: match.content,
      style: match.style,
    });

    // 문법 기호 토큰 (끝)
    tokens.push({
      type: 'syntax',
      content: match.syntax,
      style: inheritStyle,
    });

    currentPos = match.end;
  }

  // 남은 텍스트 처리
  if (currentPos < text.length) {
    const plainText = text.substring(currentPos);
    tokens.push({
      type: 'text',
      content: plainText,
      style: inheritStyle,
    });
  }

  // 빈 토큰 배열이면 기본 텍스트 반환
  if (tokens.length === 0 && text.length > 0) {
    tokens.push({
      type: 'text',
      content: text,
      style: inheritStyle,
    });
  }

  return tokens;
}

/**
 * 메인 마크다운 파서
 * 전체 마크다운 텍스트를 토큰 배열로 변환
 */
export function parseMarkdownToTokens(markdown: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heading 처리
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const headingStyle = `heading${level}` as 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6';

      // 문법 기호 토큰 (# 기호들과 공백)
      tokens.push({
        type: 'syntax',
        content: headingMatch[1] + ' ',
        style: headingStyle,
        level,
      });

      // 내용 부분에 인라인 스타일 적용
      const inlineTokens = parseInlineMarkdown(content, headingStyle);
      tokens.push(...inlineTokens);

      // 줄바꿈 토큰 추가 (마지막 줄 제외)
      if (i < lines.length - 1) {
        tokens.push({
          type: 'text',
          content: '\n',
        });
      }
    } else {
      // 일반 텍스트 라인 처리
      const inlineTokens = parseInlineMarkdown(line);
      tokens.push(...inlineTokens);

      // 줄바꿈 토큰 추가 (마지막 줄 제외)
      if (i < lines.length - 1) {
        tokens.push({
          type: 'text',
          content: '\n',
        });
      }
    }
  }

  return tokens;
}

/**
 * 토큰 배열을 HTML 문자열로 변환
 */
export function tokensToHTML(tokens: MarkdownToken[]): string {
  let html = '';

  for (const token of tokens) {
    const classes: string[] = [];
    
    // 타입 클래스
    classes.push(token.type === 'syntax' ? 'md-syntax' : 'md-text');
    
    // 스타일 클래스
    if (token.style) {
      classes.push(`md-${token.style}`);
    }

    const className = classes.join(' ');
    const dataType = token.type;
    
    // 줄바꿈 처리
    if (token.content === '\n') {
      html += '<br>';
    } else {
      // 내용 이스케이프
      const escapedContent = escapeHtml(token.content);
      html += `<span class="${className}" data-type="${dataType}">${escapedContent}</span>`;
    }
  }

  return html;
}

/**
 * 마크다운 텍스트를 HTML로 직접 변환하는 헬퍼 함수
 */
export function markdownToHTML(markdown: string): string {
  const tokens = parseMarkdownToTokens(markdown);
  return tokensToHTML(tokens);
}

