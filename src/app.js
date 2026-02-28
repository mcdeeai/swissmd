const els = {
  docList: document.getElementById("doc-list"),
  gutter: document.getElementById("gutter"),
  docSearch: document.getElementById("doc-search"),
  docTitleInput: document.getElementById("doc-title-input"),
  editor: document.getElementById("editor"),
  preview: document.getElementById("preview"),
  docTitleLabel: document.getElementById("doc-title-label"),
  docBreadcrumbs: document.getElementById("doc-breadcrumbs"),
  linksOutList: document.getElementById("links-out-list"),
  backlinksList: document.getElementById("backlinks-list"),
  editorPreview: document.getElementById("editor-preview"),
  modeEditBtn: document.getElementById("mode-edit-btn"),
  modeSplitBtn: document.getElementById("mode-split-btn"),
  modePreviewBtn: document.getElementById("mode-preview-btn"),
  newDocBtn: document.getElementById("new-doc-btn"),
  saveDocBtn: document.getElementById("save-doc-btn"),
  openFolderBtn: document.getElementById("open-folder-btn"),
  exportHtmlBtn: document.getElementById("export-html-btn"),
  exportPdfBtn: document.getElementById("export-pdf-btn"),
  themeSelect: document.getElementById("theme-select"),
  quickOpenDialog: document.getElementById("quick-open-dialog"),
  quickOpenInput: document.getElementById("quick-open-input"),
  quickOpenResults: document.getElementById("quick-open-results"),
  inspectorToggleBtn: document.getElementById("inspector-toggle-btn"),
  inspector: document.querySelector(".inspector"),
  sidebarToggleBtn: document.getElementById("sidebar-toggle-btn"),
  sidebar: document.querySelector(".sidebar"),
  appShell: document.getElementById("app-shell"),
  modeReadBtn: document.getElementById("mode-read-btn"),
  tocList: document.getElementById("toc-list"),
};

const STORAGE_KEY = "swissmd.workspace.v1";
const THEME_STORAGE_KEY = "swissmd.theme.v1";
const VALID_MODES = ["edit", "split", "preview", "read"];
const VALID_THEMES = ["swiss", "linen", "blueprint", "blueprint-dark", "midnight", "brutalist", "brutalist-dark", "system"];

const state = {
  docs: [],
  activeId: null,
  mode: "preview",
  theme: "swiss",
  query: "",
  quickOpenQuery: "",
  quickOpenResultIds: [],
  quickOpenIndex: 0,
  folderHandle: null,
  docHandles: new Map(),
  autosaveTimer: null,
  statusTimer: null,
  storageWarningShown: false,
};

function normalizeTitle(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function basename(path) {
  return path.split("/").pop() ?? path;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inferTitle(content, fallback = "Untitled") {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function createDoc(input = {}) {
  const id = input.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const title = (input.title || "").trim() || "Untitled";
  return {
    id,
    title,
    content: input.content ?? "",
    path: input.path ?? "",
    handleKey: input.handleKey ?? "",
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
  };
}

function extractWikiLinks(content) {
  const links = [];
  const regex = /\[\[([^[\]]+)\]\]/g;
  let match = regex.exec(content);
  while (match) {
    const title = match[1].trim();
    if (title) links.push(title);
    match = regex.exec(content);
  }
  return [...new Set(links)];
}

function findDocByTitle(title) {
  const key = normalizeTitle(title);
  return state.docs.find((doc) => normalizeTitle(doc.title) === key) || null;
}

function getActiveDoc() {
  return state.docs.find((doc) => doc.id === state.activeId) || null;
}

function saveWorkspaceToStorage() {
  const payload = {
    activeId: state.activeId,
    mode: state.mode,
    docs: state.docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      path: doc.path,
      handleKey: doc.handleKey,
      updatedAt: doc.updatedAt,
    })),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error("Could not save workspace.", error);
    if (!state.storageWarningShown) {
      state.storageWarningShown = true;
      setStatus("Local cache unavailable");
    }
    return false;
  }
}

function flushWorkspaceSave() {
  clearTimeout(state.autosaveTimer);
  saveWorkspaceToStorage();
}

function loadWorkspaceFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.docs) || !parsed.docs.length) return false;
    state.docs = parsed.docs.map((doc) =>
      createDoc({
        ...doc,
        id: doc.id,
      }),
    );
    state.activeId = parsed.activeId || state.docs[0].id;
    if (VALID_MODES.includes(parsed.mode)) state.mode = parsed.mode;
    return true;
  } catch (error) {
    console.error("Could not load saved workspace.", error);
    if (!state.storageWarningShown) {
      state.storageWarningShown = true;
      setStatus("Local cache unavailable");
    }
    return false;
  }
}

function loadThemeFromStorage() {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    if (VALID_THEMES.includes(theme)) state.theme = theme;
  } catch (error) {
    console.error("Could not load theme preference.", error);
  }
}

function applyTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return;
  state.theme = theme;

  let targetTheme = theme;
  if (theme === "system") {
    targetTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "midnight" : "swiss";
  }

  document.documentElement.dataset.theme = targetTheme;
  if (els.themeSelect && els.themeSelect.value !== theme) {
    els.themeSelect.value = theme;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Could not save theme preference.", error);
  }
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.theme === "system") applyTheme("system");
});

function seedWorkspace() {
  state.docs = [
    createDoc({
      title: "Welcome",
      content: `# Welcome

SwissMD is a focused markdown workspace.

Try:
- \`Cmd/Ctrl + K\` for Quick Open
- \`Cmd/Ctrl + N\` to create a new doc
- Wiki links like [[Project Brief]]

## Why Swiss style?

Strong grid, high contrast typography, and minimal decoration keep the writing surface calm.`,
      path: "workspace/Welcome.md",
    }),
    createDoc({
      title: "Project Brief",
      content: `# Project Brief

Build a simplified Craft-inspired markdown app:

1. Fast note capture
2. Live preview
3. Links and backlinks
4. Export HTML/PDF

See also [[Welcome]] and [[Roadmap]].`,
      path: "workspace/Project Brief.md",
    }),
    createDoc({
      title: "Roadmap",
      content: `# Roadmap

## MVP

- Local markdown workspace
- Quick open + search
- Markdown editor/preview split

## Next

- More markdown extensions
- File rename and move
- Optional sync`,
      path: "workspace/Roadmap.md",
    }),
  ];
  state.activeId = state.docs[0].id;
}

function setStatus(message, ok = false) {
  clearTimeout(state.statusTimer);
  els.docBreadcrumbs.textContent = message;
  els.docBreadcrumbs.classList.toggle("status-ok", ok);
  state.statusTimer = setTimeout(() => {
    renderBreadcrumbs();
    els.docBreadcrumbs.classList.remove("status-ok");
  }, 1800);
}

function renderBreadcrumbs() {
  const doc = getActiveDoc();
  if (!doc) return;
  const path = doc.path || "Local Workspace";
  const parts = path.split("/");
  els.docBreadcrumbs.innerHTML = "";
  parts.forEach((part, i) => {
    const span = document.createElement("span");
    span.textContent = part;
    els.docBreadcrumbs.append(span);
    if (i < parts.length - 1) {
      const sep = document.createElement("i");
      sep.textContent = "/";
      els.docBreadcrumbs.append(sep);
    }
  });
}

function filteredDocs(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [...state.docs];
  return state.docs.filter((doc) => {
    const inTitle = doc.title.toLowerCase().includes(q);
    const inContent = doc.content.toLowerCase().includes(q);
    const inPath = doc.path.toLowerCase().includes(q);
    return inTitle || inContent || inPath;
  });
}

function renderDocList() {
  const docs = filteredDocs(state.query);
  els.docList.innerHTML = "";

  if (!docs.length) {
    const empty = document.createElement("p");
    empty.textContent = "No matching docs";
    empty.style.padding = "0.75rem";
    empty.style.color = "var(--ink-muted)";
    els.docList.append(empty);
    return;
  }

  docs.forEach((doc) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "doc-item";
    if (doc.id === state.activeId) button.classList.add("is-active");
    button.dataset.id = doc.id;
    button.innerHTML = `<strong>${escapeHtml(doc.title)}</strong><small>${escapeHtml(doc.path || "Local Workspace")}</small>`;
    els.docList.append(button);
  });
}

function parseInline(rawText) {
  let text = escapeHtml(rawText);

  text = text.replace(/`([^`]+)`/g, (_m, value) => `<code>${value}</code>`);

  text = text.replace(/\[\[([^[\]]+)\]\]/g, (_m, value) => {
    const target = value.trim();
    return `<a href="#" data-wikilink="${encodeURIComponent(target)}">${escapeHtml(target)}</a>`;
  });

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, href) => {
    const safeHref = escapeHtml(href);
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  return text;
}

function parseMarkdown(markdownText) {
  const lines = markdownText.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let inCode = false;
  let codeBuffer = [];
  let codeLang = "";
  let ulOpen = false;
  let olOpen = false;

  const closeLists = () => {
    if (ulOpen) {
      html.push("</ul>");
      ulOpen = false;
    }
    if (olOpen) {
      html.push("</ol>");
      olOpen = false;
    }
  };

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${parseInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeLists();
      if (!inCode) {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
        codeBuffer = [];
      } else {
        const classAttr = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
        html.push(`<pre><code${classAttr}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        inCode = false;
        codeLang = "";
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      flushParagraph();
      closeLists();
      return;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      closeLists();
      html.push("<hr />");
      return;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = heading[1].length;
      html.push(`<h${level}>${parseInline(heading[2])}</h${level}>`);
      return;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeLists();
      html.push(`<blockquote>${parseInline(quote[1])}</blockquote>`);
      return;
    }

    const ul = trimmed.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushParagraph();
      if (olOpen) {
        html.push("</ol>");
        olOpen = false;
      }
      if (!ulOpen) {
        html.push("<ul>");
        ulOpen = true;
      }
      html.push(`<li>${parseInline(ul[1])}</li>`);
      return;
    }

    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushParagraph();
      if (ulOpen) {
        html.push("</ul>");
        ulOpen = false;
      }
      if (!olOpen) {
        html.push("<ol>");
        olOpen = true;
      }
      html.push(`<li>${parseInline(ol[1])}</li>`);
      return;
    }

    paragraph.push(trimmed);
  });

  if (inCode) {
    const classAttr = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
    html.push(`<pre><code${classAttr}>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  flushParagraph();
  closeLists();

  return html.join("\n");
}

function renderPreview() {
  const doc = getActiveDoc();
  if (!doc) return;
  els.preview.innerHTML = parseMarkdown(doc.content);
}

function ensureDocExistsByTitle(title) {
  const existing = findDocByTitle(title);
  if (existing) return existing;
  const newDoc = createDoc({
    title: title.trim() || "Untitled",
    content: `# ${title.trim() || "Untitled"}\n`,
    path: "",
  });
  state.docs.unshift(newDoc);
  return newDoc;
}

function renderLinksPanels() {
  const doc = getActiveDoc();
  if (!doc) return;

  const outLinks = extractWikiLinks(doc.content);
  els.linksOutList.innerHTML = "";
  if (!outLinks.length) {
    els.linksOutList.innerHTML = "<li>No outbound links</li>";
  } else {
    outLinks.forEach((title) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = title;
      button.dataset.openTitle = title;
      li.append(button);
      els.linksOutList.append(li);
    });
  }

  const currentTitleKey = normalizeTitle(doc.title);
  const backlinks = state.docs.filter((candidate) => {
    if (candidate.id === doc.id) return false;
    return extractWikiLinks(candidate.content).some(
      (linkTitle) => normalizeTitle(linkTitle) === currentTitleKey,
    );
  });

  els.backlinksList.innerHTML = "";
  if (!backlinks.length) {
    els.backlinksList.innerHTML = "<li>No backlinks yet</li>";
    return;
  }

  backlinks.forEach((linkedDoc) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = linkedDoc.id;
    button.textContent = linkedDoc.title;
    li.append(button);
    els.backlinksList.append(li);
  });
}

function renderActiveDoc() {
  const doc = getActiveDoc();
  if (!doc) return;

  els.docTitleInput.value = doc.title;
  els.editor.value = doc.content;
  els.docTitleLabel.textContent = doc.title;
  renderBreadcrumbs();
  renderPreview();
  renderLinksPanels();
  renderTOC();
  renderGutter();
  renderDocList();
}

function setActiveDoc(id) {
  if (!state.docs.some((doc) => doc.id === id)) return;
  state.activeId = id;
  renderActiveDoc();
  saveWorkspaceToStorage();
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(() => {
    saveWorkspaceToStorage();
  }, 250);
}

function syncInputsToActiveDoc() {
  const doc = getActiveDoc();
  if (!doc) return;
  doc.title = els.docTitleInput.value.trim() || "Untitled";
  doc.content = els.editor.value;
  doc.updatedAt = Date.now();
  els.docTitleLabel.textContent = doc.title;
  renderBreadcrumbs();
  renderPreview();
  renderLinksPanels();
  renderTOC();
  renderGutter();
  renderDocList();
  scheduleAutosave();
}

function renderGutter() {
  const lines = els.editor.value.split("\n").length;
  let html = "";
  for (let i = 1; i <= lines; i++) {
    html += `<div>${i}</div>`;
  }
  els.gutter.innerHTML = html;
}

function syncScroll() {
  els.gutter.scrollTop = els.editor.scrollTop;
}

function setMode(mode) {
  if (!VALID_MODES.includes(mode)) return;
  state.mode = mode;
  els.editorPreview.classList.remove("mode-edit", "mode-split", "mode-preview", "mode-read");
  els.editorPreview.classList.add(`mode-${mode}`);
  els.modeEditBtn.classList.toggle("is-active", mode === "edit");
  els.modeSplitBtn.classList.toggle("is-active", mode === "split");
  els.modePreviewBtn.classList.toggle("is-active", mode === "preview");
  if (els.modeReadBtn) els.modeReadBtn.classList.toggle("is-active", mode === "read");

  // Reading mode: hide sidebar and inspector, center content
  if (els.appShell) {
    els.appShell.classList.toggle("is-reading", mode === "read");
  }

  saveWorkspaceToStorage();
}

function renderTOC() {
  if (!els.tocList) return;
  const headings = els.preview.querySelectorAll("h1, h2, h3");
  if (!headings.length) {
    els.tocList.innerHTML = '<span style="color:var(--ink-muted);font-size:0.78rem">No headings</span>';
    return;
  }
  els.tocList.innerHTML = Array.from(headings)
    .map((h, i) => {
      const level = parseInt(h.tagName.charAt(1), 10);
      const text = h.textContent.trim();
      const id = `toc-heading-${i}`;
      h.id = id;
      return `<a href="#${id}" data-level="${level}">${text}</a>`;
    })
    .join("");

  // Smooth-scroll to heading on click
  els.tocList.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    e.preventDefault();
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function newDoc() {
  let index = 1;
  const existingNames = new Set(state.docs.map((doc) => normalizeTitle(doc.title)));
  let title = `Untitled ${index}`;
  while (existingNames.has(normalizeTitle(title))) {
    index += 1;
    title = `Untitled ${index}`;
  }
  const doc = createDoc({ title, content: `# ${title}\n` });
  state.docs.unshift(doc);
  setActiveDoc(doc.id);
  els.docTitleInput.focus();
  els.docTitleInput.select();
}

async function saveDocToDisk() {
  const doc = getActiveDoc();
  if (!doc) return;

  const handle = doc.handleKey ? state.docHandles.get(doc.handleKey) : null;
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(doc.content);
    await writable.close();
    setStatus("Saved to workspace file", true);
    return;
  }

  const filename = `${doc.title.replace(/[^\w\- ]/g, "").trim() || "document"}.md`;
  const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded markdown file", true);
}

function deriveDocFromFile(path, content, handleKey) {
  const base = basename(path);
  const titleFromName = base.replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim();
  const title = inferTitle(content, titleFromName || "Untitled");
  return createDoc({
    id: `file_${path}`,
    title,
    content,
    path,
    handleKey,
  });
}

async function walkMarkdownFiles(directoryHandle, root = "", output = [], handleMap = state.docHandles) {
  for await (const [name, handle] of directoryHandle.entries()) {
    const childPath = root ? `${root}/${name}` : name;
    if (handle.kind === "directory") {
      await walkMarkdownFiles(handle, childPath, output, handleMap);
      continue;
    }
    if (!name.toLowerCase().endsWith(".md")) continue;
    const file = await handle.getFile();
    const content = await file.text();
    output.push(deriveDocFromFile(childPath, content, childPath));
    handleMap.set(childPath, handle);
  }
  return output;
}

async function openFolder() {
  if (!window.showDirectoryPicker) {
    alert("This browser does not support local folder access. Try Chrome/Edge desktop.");
    return;
  }

  try {
    const folder = await window.showDirectoryPicker();
    const nextHandles = new Map();
    const docs = await walkMarkdownFiles(folder, "", [], nextHandles);
    state.folderHandle = folder;
    state.docHandles = nextHandles;
    state.docs = docs.sort((a, b) => a.path.localeCompare(b.path));

    if (!state.docs.length) {
      state.docs = [
        createDoc({
          title: "Untitled",
          content: "# Untitled\n",
          path: "",
        }),
      ];
    }
    state.activeId = state.docs[0].id;
    saveWorkspaceToStorage();
    renderActiveDoc();
    setStatus("Folder opened", true);
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Could not open folder.", error);
    alert("Failed to open folder.");
  }
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function exportHtml() {
  const doc = getActiveDoc();
  if (!doc) return;
  const contentHtml = parseMarkdown(doc.content);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
    body { margin: 0; padding: 3rem 1rem; color: #121212; font: 400 18px/1.7 "IBM Plex Sans", sans-serif; background: #f7f5f2; }
    article { max-width: 72ch; margin: 0 auto; background: #fff; padding: 2.4rem; border: 1px solid #d9d5d1; }
    h1,h2,h3 { line-height: 1.2; }
    pre { background: #f2f0ed; padding: 0.8rem 1rem; overflow:auto; }
    blockquote { border-left: 2px solid #d62828; margin-left: 0; padding-left: 1rem; color: #57524d; }
    a { color: #d62828; }
  </style>
</head>
<body>
  <article>
    ${contentHtml}
  </article>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${doc.title.replace(/[^\w\- ]/g, "").trim() || "document"}.html`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported HTML", true);
}

function exportPdf() {
  const doc = getActiveDoc();
  if (!doc) return;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");
  if (!popup) {
    alert("Popup blocked. Allow popups to export PDF.");
    return;
  }
  const html = parseMarkdown(doc.content);
  popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeAttribute(doc.title)}</title>
  <style>
    body { margin: 0; padding: 2rem; color: #121212; font: 400 16px/1.7 "IBM Plex Sans", sans-serif; }
    article { max-width: 72ch; margin: 0 auto; }
    pre { background: #f2f0ed; padding: 0.8rem 1rem; overflow:auto; }
    blockquote { border-left: 2px solid #d62828; margin-left: 0; padding-left: 1rem; color: #57524d; }
    a { color: #d62828; }
  </style>
</head>
<body>
  <article>${html}</article>
  <script>setTimeout(() => { window.print(); }, 120);<\/script>
</body>
</html>`);
  popup.document.close();
  setStatus("PDF print dialog opened", true);
}

function computeQuickOpenResults(query) {
  const q = query.trim().toLowerCase();
  const docs = q ? filteredDocs(q) : [...state.docs];
  return docs.slice(0, 50).map((doc) => doc.id);
}

function renderQuickOpenResults() {
  state.quickOpenResultIds = computeQuickOpenResults(state.quickOpenQuery);
  if (state.quickOpenIndex >= state.quickOpenResultIds.length) state.quickOpenIndex = 0;
  els.quickOpenResults.innerHTML = "";

  if (!state.quickOpenResultIds.length) {
    const li = document.createElement("li");
    li.textContent = "No results";
    li.style.padding = "0.75rem";
    li.style.color = "var(--ink-muted)";
    els.quickOpenResults.append(li);
    return;
  }

  state.quickOpenResultIds.forEach((id, index) => {
    const doc = state.docs.find((item) => item.id === id);
    if (!doc) return;
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-open-item";
    if (index === state.quickOpenIndex) button.classList.add("is-active");
    button.dataset.id = doc.id;
    button.innerHTML = `<strong>${escapeHtml(doc.title)}</strong><br /><small>${escapeHtml(doc.path || "Local Workspace")}</small>`;
    li.append(button);
    els.quickOpenResults.append(li);
  });
}

function openQuickOpen() {
  state.quickOpenQuery = "";
  state.quickOpenIndex = 0;
  if (!els.quickOpenDialog.open) els.quickOpenDialog.showModal();
  els.quickOpenInput.value = "";
  renderQuickOpenResults();
  requestAnimationFrame(() => {
    els.quickOpenInput.focus();
  });
}

function closeQuickOpen() {
  if (els.quickOpenDialog.open) els.quickOpenDialog.close();
}

function openQuickOpenSelection() {
  const id = state.quickOpenResultIds[state.quickOpenIndex];
  if (!id) return;
  setActiveDoc(id);
  closeQuickOpen();
}

function bindEvents() {
  els.docSearch.addEventListener("input", () => {
    state.query = els.docSearch.value;
    renderDocList();
  });

  els.docList.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-id]");
    if (!target) return;
    setActiveDoc(target.dataset.id);
  });

  els.docTitleInput.addEventListener("input", syncInputsToActiveDoc);
  els.editor.addEventListener("input", syncInputsToActiveDoc);
  els.editor.addEventListener("scroll", syncScroll);

  els.modeEditBtn.addEventListener("click", () => setMode("edit"));
  els.modeSplitBtn.addEventListener("click", () => setMode("split"));
  els.modePreviewBtn.addEventListener("click", () => setMode("preview"));
  if (els.modeReadBtn) {
    els.modeReadBtn.addEventListener("click", () => setMode("read"));
  }

  els.newDocBtn.addEventListener("click", newDoc);
  els.saveDocBtn.addEventListener("click", () => {
    saveDocToDisk().catch((error) => {
      console.error("Failed to save file.", error);
      alert("Failed to save file.");
    });
  });
  els.openFolderBtn.addEventListener("click", openFolder);
  els.exportHtmlBtn.addEventListener("click", exportHtml);
  els.exportPdfBtn.addEventListener("click", exportPdf);
  if (els.themeSelect) {
    els.themeSelect.addEventListener("change", () => {
      applyTheme(els.themeSelect.value);
    });
  }

  if (els.inspectorToggleBtn && els.inspector) {
    els.inspectorToggleBtn.addEventListener("click", () => {
      els.inspector.classList.toggle("is-collapsed");
      const isCollapsed = els.inspector.classList.contains("is-collapsed");
      els.inspectorToggleBtn.title = isCollapsed ? "Show inspector" : "Hide inspector";
      try {
        localStorage.setItem("swissmd.inspector.collapsed", String(isCollapsed));
      } catch (_) { }
    });

    // Restore collapsed state from storage
    try {
      const stored = localStorage.getItem("swissmd.inspector.collapsed");
      if (stored === "true") {
        els.inspector.classList.add("is-collapsed");
        els.inspectorToggleBtn.title = "Show inspector";
      }
    } catch (_) { }
  }

  // Sidebar toggle
  if (els.sidebarToggleBtn && els.sidebar) {
    els.sidebarToggleBtn.addEventListener("click", () => {
      els.sidebar.classList.toggle("is-collapsed");
      const isCollapsed = els.sidebar.classList.contains("is-collapsed");
      els.sidebarToggleBtn.title = isCollapsed ? "Show sidebar" : "Hide sidebar";
      try {
        localStorage.setItem("swissmd.sidebar.collapsed", String(isCollapsed));
      } catch (_) { }
    });

    try {
      const stored = localStorage.getItem("swissmd.sidebar.collapsed");
      if (stored === "true") {
        els.sidebar.classList.add("is-collapsed");
        els.sidebarToggleBtn.title = "Show sidebar";
      }
    } catch (_) { }
  }

  els.preview.addEventListener("click", (event) => {
    const wikiAnchor = event.target.closest("a[data-wikilink]");
    if (!wikiAnchor) return;
    event.preventDefault();
    const title = decodeURIComponent(wikiAnchor.dataset.wikilink || "").trim();
    if (!title) return;
    const doc = ensureDocExistsByTitle(title);
    setActiveDoc(doc.id);
  });

  [els.linksOutList, els.backlinksList].forEach((list) => {
    list.addEventListener("click", (event) => {
      const byId = event.target.closest("button[data-id]");
      if (byId) {
        setActiveDoc(byId.dataset.id);
        return;
      }
      const byTitle = event.target.closest("button[data-open-title]");
      if (byTitle) {
        const doc = ensureDocExistsByTitle(byTitle.dataset.openTitle);
        setActiveDoc(doc.id);
      }
    });
  });

  els.quickOpenInput.addEventListener("input", () => {
    state.quickOpenQuery = els.quickOpenInput.value;
    state.quickOpenIndex = 0;
    renderQuickOpenResults();
  });

  els.quickOpenInput.addEventListener("keydown", (event) => {
    if (!state.quickOpenResultIds.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.quickOpenIndex = (state.quickOpenIndex + 1) % state.quickOpenResultIds.length;
      renderQuickOpenResults();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      state.quickOpenIndex =
        (state.quickOpenIndex - 1 + state.quickOpenResultIds.length) % state.quickOpenResultIds.length;
      renderQuickOpenResults();
    } else if (event.key === "Enter") {
      event.preventDefault();
      openQuickOpenSelection();
    }
  });

  els.quickOpenResults.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;
    setActiveDoc(button.dataset.id);
    closeQuickOpen();
  });

  window.addEventListener("keydown", (event) => {
    const isMeta = event.metaKey || event.ctrlKey;
    if (!isMeta) return;

    if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      openQuickOpen();
    }

    if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveDocToDisk().catch((error) => {
        console.error("Failed to save file.", error);
      });
    }

    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      newDoc();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushWorkspaceSave();
    }
  });
  window.addEventListener("beforeunload", flushWorkspaceSave);
}

function init() {
  loadThemeFromStorage();
  applyTheme(state.theme);

  const loaded = loadWorkspaceFromStorage();
  if (!loaded) seedWorkspace();
  if (!state.docs.length) seedWorkspace();
  if (!state.activeId || !state.docs.some((doc) => doc.id === state.activeId)) {
    state.activeId = state.docs[0].id;
  }

  setMode(state.mode);
  bindEvents();
  renderActiveDoc();

  if (!window.showDirectoryPicker) {
    els.openFolderBtn.disabled = true;
    els.openFolderBtn.title = "Folder access requires a Chromium browser.";
  }
}

init();
