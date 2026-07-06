/* =========================================================
   AMIT AI — markdown.js
   Dependency-free Markdown -> HTML renderer + basic syntax
   highlighter. Output HTML matches the classes defined in
   chat.css (.code-block, .tok-*, etc).
   Depends on: utils.js (for escapeHtml, uid)
   ========================================================= */

window.Markdown = (function () {

  /* ---------------------------------------------------------
     render — main entry point. Takes raw markdown text,
     returns safe HTML string ready to inject into .msg-text
  --------------------------------------------------------- */
  function render(raw) {
    if (!raw) return "";

    // Step 1: pull out fenced code blocks first (```lang\ncode\n```)
    // and replace with placeholders so the rest of the markdown
    // parsing doesn't mangle code content.
    const codeBlocks = [];
    let text = raw.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: (lang || "text").toLowerCase(), code: code.replace(/\n$/, "") });
      return `%%CODEBLOCK_${idx}%%`;
    });

    // Step 2: escape remaining HTML in the non-code text
    text = Utils.escapeHtml(text);

    // Step 3: headings
    text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");

    // Step 4: blockquote
    text = text.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");

    // Step 5: bold, italic
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, "<em>$1</em>");

    // Step 6: inline code
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Step 7: links [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Step 8: unordered lists
    text = text.replace(/(^|\n)([-*] .*(\n[-*] .*)*)/g, (match, lead, block) => {
      const items = block.split("\n").map(line => line.replace(/^[-*] /, "").trim());
      return lead + "<ul>" + items.map(i => `<li>${i}</li>`).join("") + "</ul>";
    });

    // Step 9: ordered lists
    text = text.replace(/(^|\n)(\d+\. .*(\n\d+\. .*)*)/g, (match, lead, block) => {
      const items = block.split("\n").map(line => line.replace(/^\d+\. /, "").trim());
      return lead + "<ol>" + items.map(i => `<li>${i}</li>`).join("") + "</ol>";
    });

    // Step 10: paragraphs — wrap remaining loose lines
    text = text
      .split(/\n{2,}/)
      .map(block => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (/^<(h1|h2|h3|ul|ol|blockquote)/.test(trimmed)) return trimmed;
        return "<p>" + trimmed.replace(/\n/g, "<br>") + "</p>";
      })
      .join("");

    // Step 11: re-insert code blocks as full HTML with header + copy button
    text = text.replace(/%%CODEBLOCK_(\d+)%%/g, (match, idx) => {
      const block = codeBlocks[parseInt(idx, 10)];
      return buildCodeBlockHtml(block.lang, block.code);
    });

    return text;
  }

  /* ---------------------------------------------------------
     buildCodeBlockHtml — wraps highlighted code with the
     header bar (language label + copy button) matching
     chat.css's .code-block structure.
  --------------------------------------------------------- */
  function buildCodeBlockHtml(lang, code) {
    const blockId = Utils.uid("code");
    const highlighted = highlight(code, lang);
    return `
      <div class="code-block">
        <div class="code-block-header">
          <span>${Utils.escapeHtml(lang || "text")}</span>
          <button class="copy-code-btn" data-code-target="${blockId}">📋 Copy</button>
        </div>
        <pre><code id="${blockId}">${highlighted}</code></pre>
      </div>`;
  }

  /* ---------------------------------------------------------
     highlight — lightweight regex-based syntax highlighter.
     Not a full tokenizer, but covers common patterns well
     enough for chat-style code snippets, fully offline.
  --------------------------------------------------------- */
  function highlight(code, lang) {
    let escaped = Utils.escapeHtml(code);

    const commentPatterns = {
      js: /(\/\/.*$)/gm,
      javascript: /(\/\/.*$)/gm,
      python: /(#.*$)/gm,
      css: /(\/\*[\s\S]*?\*\/)/g,
      html: /(&lt;!--[\s\S]*?--&gt;)/g
    };

    const keywordList = {
      js: ["const","let","var","function","return","if","else","for","while","async","await","import","export","class","new","try","catch","default","from"],
      javascript: ["const","let","var","function","return","if","else","for","while","async","await","import","export","class","new","try","catch","default","from"],
      python: ["def","return","if","elif","else","for","while","import","from","class","try","except","with","as","lambda","None","True","False"],
      json: ["true","false","null"]
    };

    // Strings first (so keywords inside strings aren't matched)
    escaped = escaped.replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, '<span class="tok-string">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-number">$1</span>');

    // Comments
    const commentRegex = commentPatterns[lang];
    if (commentRegex) {
      escaped = escaped.replace(commentRegex, '<span class="tok-comment">$1</span>');
    }

    // Keywords
    const keywords = keywordList[lang];
    if (keywords) {
      const kwRegex = new RegExp("\\b(" + keywords.join("|") + ")\\b", "g");
      escaped = escaped.replace(kwRegex, '<span class="tok-keyword">$1</span>');
    }

    // HTML tags
    if (lang === "html") {
      escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9]+)/g, '$1<span class="tok-tag">$2</span>');
    }

    // Function calls: word followed by (
    escaped = escaped.replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, '<span class="tok-function">$1</span>');

    return escaped;
  }

  return {
    render,
    highlight
  };

})();