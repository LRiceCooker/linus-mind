// typography.js — Typographic transformation pipeline for commit messages
// 14-step pipeline: escape → extract → quotes → dashes → code → emphasis →
// callouts → continuation → footnotes → blockquotes → lists → paragraphs → urls → reinject

function looksLikeCode(text) {
  if (/_/.test(text)) return true;
  if (/\(\)/.test(text)) return true;
  if (/^(struct|enum|union|typedef)\s/.test(text)) return true;
  if (/^[A-Z][A-Z0-9_]+$/.test(text)) return true;
  if (/\.\w/.test(text) && text.length < 50) return true;
  if (/-&gt;|::/.test(text)) return true;
  if (/^CONFIG_/.test(text)) return true;
  if (/^[a-z][a-z0-9]*$/.test(text) && text.length <= 12) return true;
  return false;
}

function processBlockquotes(text) {
  const lines = text.split('\n');
  const result = [];
  let inQuote = false;

  for (const line of lines) {
    if (line.startsWith('&gt;')) {
      if (!inQuote) {
        result.push('<blockquote class="email-quote">');
        inQuote = true;
      }
      result.push(line.replace(/^(?:&gt;)+\s?/, ''));
    } else {
      if (inQuote) {
        result.push('</blockquote>');
        inQuote = false;
      }
      result.push(line);
    }
  }
  if (inQuote) result.push('</blockquote>');

  return result.join('\n');
}

function processLists(text) {
  const lines = text.split('\n');
  const result = [];
  let inList = null;
  let listItems = [];

  function flushList() {
    if (!inList || listItems.length < 2) {
      result.push(...listItems.map(item => item.raw));
    } else {
      const tag = inList === 'ol-a' ? '<ol type="a">' : inList === 'ol-1' ? '<ol>' : '<ul>';
      const closeTag = inList.startsWith('ol') ? '</ol>' : '</ul>';
      result.push(tag);
      listItems.forEach(item => result.push(`<li>${item.text}</li>`));
      result.push(closeTag);
    }
    listItems = [];
    inList = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const letteredMatch = line.match(/^ ?\(([a-z])\)\s+(.*)$/);
    if (letteredMatch) {
      if (inList && inList !== 'ol-a') flushList();
      inList = 'ol-a';
      listItems.push({ text: letteredMatch[2], raw: line });
      continue;
    }

    const numberedMatch = line.match(/^ ?\((\d+)\)\s+(.*)$/);
    if (numberedMatch) {
      if (inList && inList !== 'ol-1') flushList();
      inList = 'ol-1';
      listItems.push({ text: numberedMatch[2], raw: line });
      continue;
    }

    const bulletMatch = line.match(/^ ?[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (inList && inList !== 'ul') flushList();
      inList = 'ul';
      listItems.push({ text: bulletMatch[1], raw: line });
      continue;
    }

    if (inList) {
      if (line.trim() === '') continue;
      if (/^\s{2,}/.test(line)) {
        if (listItems.length > 0) {
          listItems[listItems.length - 1].text += ' ' + line.trim();
          listItems[listItems.length - 1].raw += '\n' + line;
          continue;
        }
      }
      flushList();
    }

    result.push(line);
  }
  flushList();

  return result.join('\n');
}

function processParagraphs(text) {
  const blocks = text.split(/\n\n+/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(pre|blockquote|ol|ul|footer)|^%%/.test(trimmed)) return trimmed;
    return `<p>${trimmed}</p>`;
  }).filter(Boolean).join('\n');
}

export function typeset(rawText) {
  if (!rawText || !rawText.trim()) return '';
  let text = rawText;

  // Step 1: HTML escape
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Step 2: Extract structural blocks
  const codeBlocks = [];
  let trailerLines = [];

  // Extract tab/4-space indented code blocks (preceded by blank line)
  {
    const lines = text.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim() === '' && i + 1 < lines.length &&
          (lines[i + 1].startsWith('\t') || /^    /.test(lines[i + 1]))) {
        out.push('');
        i++;
        const block = [];
        while (i < lines.length) {
          if (lines[i].startsWith('\t')) {
            block.push(lines[i].slice(1));
            i++;
          } else if (/^    /.test(lines[i])) {
            block.push(lines[i].slice(4));
            i++;
          } else if (lines[i].trim() === '' && i + 1 < lines.length &&
                     (lines[i + 1].startsWith('\t') || /^    /.test(lines[i + 1]))) {
            block.push('');
            i++;
          } else {
            break;
          }
        }
        const idx = codeBlocks.length;
        codeBlocks.push(block.join('\n').trimEnd());
        out.push(`%%CODE_BLOCK_${idx}%%`);
      } else {
        out.push(lines[i]);
        i++;
      }
    }
    text = out.join('\n');
  }

  // Extract git trailers at the end
  {
    const TRAILER_RE = /^(Signed-off-by|Acked-by|Reviewed-by|Tested-by|Reported-by|Requested-by|Cc|Link|Fixes):/;
    const lines = text.split('\n');
    let trailerStart = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (TRAILER_RE.test(lines[i])) {
        trailerStart = i;
      } else if (lines[i].trim() === '' && trailerStart >= 0) {
        continue;
      } else {
        break;
      }
    }
    if (trailerStart >= 0) {
      for (let i = trailerStart; i < lines.length; i++) {
        if (TRAILER_RE.test(lines[i])) {
          trailerLines.push(lines[i].replace(/\s*&lt;.*?&gt;/g, '').trim());
        }
      }
      const before = lines.slice(0, trailerStart).join('\n').trimEnd();
      text = before + (before ? '\n\n' : '') + '%%TRAILERS%%';
    }
  }

  // Step 3: Smart double quotes + contractions
  text = text.replace(/(^|[\s(\[{])&quot;(\S)/gm, '$1\u201C$2');
  text = text.replace(/(\S)&quot;/g, '$1\u201D');
  text = text.replace(/&quot;/g, '\u201C');
  // Contractions: don't, it's, they're, etc.
  text = text.replace(/(\w)'(\w)/g, '$1\u2019$2');
  // Year abbreviation: '05, '95
  text = text.replace(/(^|[\s(])'(\d\d\b)/gm, '$1\u2019$2');

  // Step 4: Dashes and ellipsis
  text = text.replace(/--/g, '\u2014');
  text = text.replace(/\.\.\./g, '\u2026');

  // Step 5: Single-quoted code + backticks + CONFIG_ + hex
  text = text.replace(/'([^'\n]+)'/g, (match, content) => {
    if (looksLikeCode(content)) return `<code>${content}</code>`;
    return `\u2018${content}\u2019`;
  });
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/(?<!>)\bCONFIG_[A-Z_0-9]+\b/g, '<code>$&</code>');
  text = text.replace(/(?<!>)\b0x[0-9a-fA-F]+\b/g, '<code>$&</code>');

  // Handle remaining possessive/standalone single quotes (after code pairs handled)
  text = text.replace(/(\w)'(?=[\s.,;:!?\u2014\u2026)\]]|$)/gm, '$1\u2019');

  // Step 6: Emphasis *word* or *multiple words*
  text = text.replace(/(^|[\s(])\*([^\s*][^*]*[^\s*])\*(?=[\s),.\u2014!?:;\u2026]|$)/gm, '$1<em>$2</em>');
  text = text.replace(/(^|[\s(])\*([^\s*]+)\*(?=[\s),.\u2014!?:;\u2026]|$)/gm, '$1<em>$2</em>');

  // Step 7: Callouts
  text = text.replace(/^(NOTE!|NOTE:|IMPORTANT!|IMPORTANT:|WARNING!|WARNING:|FIXME:|TODO:)/gm,
    '<strong class="callout">$1</strong>');

  // Step 8: Continuation lines (.. )
  text = text.replace(/^\.\. (.+)$/gm, '<span class="continuation">\u2014 $1</span>');

  // Step 9: Footnote markers (*)
  text = text.replace(/^\(\*\)/gm, '<span class="footnote-marker">(*)</span>');

  // Step 10: Email quotes
  text = processBlockquotes(text);

  // Step 11: Lists
  text = processLists(text);

  // Step 12: Paragraphs
  text = processParagraphs(text);

  // Step 13: URLs — clickable links
  text = text.replace(/https?:\/\/[^\s)<]+[^\s)<.,;:!?]/g,
    '<a class="url" href="$&" target="_blank" rel="noopener noreferrer">$&</a>');

  // Step 14: Reinject structural blocks
  codeBlocks.forEach((code, i) => {
    text = text.replace(`%%CODE_BLOCK_${i}%%`,
      `<pre class="code-block"><code>${code}</code></pre>`);
  });
  if (trailerLines.length > 0) {
    const html = trailerLines.map(t => `<span class="trailer">${t}</span>`).join('\n');
    text = text.replace('%%TRAILERS%%',
      `<footer class="commit-trailers">${html}</footer>`);
  }

  return text;
}
