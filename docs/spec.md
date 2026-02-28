# SwissMD Product Spec (MVP to v1.2)

## Product Goal

Build a markdown-focused writing app that captures Craft's speed and polish while staying intentionally narrow: docs, links, search, and export.

## Primary User

Individual writers and knowledge workers who prefer markdown files and keyboard workflows.

## Experience Principles

1. Write-first speed: low-latency typing and keyboard-first actions.
2. Structural clarity: links/backlinks and quick navigation.
3. Swiss visual discipline: strict grid, strong typography, restrained accent color.
4. Calm UI: minimal chrome, content-forward layout.

## MVP Scope

1. Local markdown workspace:
- Open folder and index `.md` files.
- Create and edit documents.
- Autosave local workspace state.

2. Editor + preview:
- Inline markdown editing.
- Live preview in split mode.
- Mode toggle: edit/split/preview.

3. Navigation:
- Full-text search across title/content/path.
- Quick Open dialog (`Cmd/Ctrl + K`).

4. Knowledge graph lite:
- Wiki links `[[Doc Name]]`.
- Backlinks panel.

5. Output:
- Export current document as standalone HTML.
- Print-to-PDF flow.

## MVP Non-Goals

- Real-time collaboration.
- Tasks/calendar.
- AI assistant.
- Rich database blocks.
- Cloud sync.

## UX Spec

### Layout

1. Left sidebar:
- Workspace actions, search, document list.

2. Center workspace:
- Top controls.
- Editor/preview area with mode switching.

3. Right inspector:
- Backlinks.
- Outbound links.
- Shortcut hints.

### Key Interactions

1. New doc:
- Shortcut `Cmd/Ctrl + N`.
- Creates titled stub, focuses title input.

2. Quick Open:
- Shortcut `Cmd/Ctrl + K`.
- Arrow up/down navigate results.
- Enter opens selected doc.

3. Link navigation:
- Clicking `[[Link]]` opens target.
- Missing target auto-creates stub note.

4. Save:
- `Cmd/Ctrl + S`.
- If file handle exists, write to file.
- Else download markdown file.

## Technical Spec

### Stack (current)

- Vanilla HTML/CSS/JS for speed of iteration.
- Browser File System Access API for optional local folder reads/writes.
- LocalStorage as workspace fallback/persistence.

### Data model

Document:

```text
id: string
title: string
content: string
path: string
handleKey: string
updatedAt: number
```

### Parsing rules (current)

Supported markdown:

- Headings
- Paragraphs
- Unordered/ordered lists
- Blockquotes
- Code fences
- Inline code
- Bold/italic/strikethrough
- Web links
- Wiki links

## Backlog

## Milestone A (Current Vertical Slice)

1. Scaffold shell + Swiss theme tokens.
2. Add editor/preview modes.
3. Add quick open and search.
4. Add wiki links + backlinks.
5. Add HTML/PDF export.

## Milestone B (v1.1)

1. Markdown engine upgrade to full CommonMark/GFM.
2. File tree with nested folders and drag/reorder (virtual).
3. Outline panel from headings.
4. Command palette actions beyond open/new/save.
5. Better save semantics (rename/move support).

## Milestone C (v1.2)

1. Tag index and saved filters.
2. Snapshot/version history.
3. Publish bundle output (static site folder).
4. Theme presets with Swiss variants.
5. Mobile layout refinements.

## Acceptance Criteria (MVP)

1. User can create and edit a note with live preview.
2. Search returns matching docs by title/content.
3. Quick Open opens docs without mouse.
4. `[[Links]]` navigate and backlinks are visible.
5. User can export current doc to HTML and open print dialog for PDF.
