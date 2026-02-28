# SwissMD

SwissMD is a simplified Craft-inspired markdown writing app with a Swiss editorial style.

This folder contains a working vertical slice:

- Markdown editor + live preview (`Edit`, `Split`, `Preview`)
- Quick Open (`Cmd/Ctrl + K`)
- Search and document list
- Wiki links (`[[Page Name]]`) and backlinks
- Theme presets (Swiss, Linen, Blueprint, Midnight)
- Export HTML and print-to-PDF
- Optional local folder import for `.md` files (Chromium browsers)

## Run

Serve this folder with any static server:

```bash
cd /Users/mcdpro/Projects/animator/swissmd
python3 -m http.server 8080
```

Open: `http://localhost:8080`

## Structure

- `/Users/mcdpro/Projects/animator/swissmd/index.html`
- `/Users/mcdpro/Projects/animator/swissmd/src/styles.css`
- `/Users/mcdpro/Projects/animator/swissmd/src/app.js`
- `/Users/mcdpro/Projects/animator/swissmd/docs/spec.md`

## Notes

- Workspace data is cached in `localStorage`.
- Folder import reads markdown files recursively.
- Saving writes back to opened files when a file handle exists; otherwise it downloads a `.md` file.
