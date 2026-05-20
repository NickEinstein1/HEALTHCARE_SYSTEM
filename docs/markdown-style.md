# Markdown style guide

**Where docs live:** authored documentation belongs in **`docs/`** (see [README.md](README.md)). The repository root keeps only **[README.md](../README.md)** as the entry point; `ehr-api/`, `infra/`, `edge-pipeline/`, and `frontend/` have short pointer READMEs that link into `docs/`.

Every Markdown file in this project should follow these rules so **markdownlint** stays clean in the editor and in CI.

Configuration: [`.markdownlint.jsonc`](../.markdownlint.jsonc) at the repo root.  
Ignored paths: [`.markdownlintignore`](../.markdownlintignore).

> **Note:** Rule **MD060** (table column style) is **turned off** in `.markdownlint.jsonc` so older docs do not spam the Problems panel. **New and edited tables must still use the aligned format below** — that prevents the visual/editor issues you saw when separator and body rows use different pipe styles.

---

## Tables — required format (authoring standard)

**Use the `aligned` style:** every pipe in a row must line up vertically with the same column in the header and separator rows. Do not mix a compact separator row (dashes only, unaligned pipes) with padded body rows in the same table.

### Template (copy this)

```markdown
| Column one | Column two | Column three |
| ---------- | ---------- | ------------ |
| Short      | 42         | Longer value |
| Another    | 7          | Text here    |
```

### Rules

1. **Header row** — one space after each opening `|` and before each closing `|`.
2. **Separator row** — dashes only; **pipe positions must match the header** (same column widths).
3. **Body rows** — pad cells with spaces so **every `|` aligns** with the header row above.
4. **Do not mix styles** in one table (e.g. `|------|--------|` compact separator with padded body rows).
5. **Leading/trailing pipes** on every row are optional but must be consistent within the table.

### Quick check

In a monospaced editor, draw a vertical line through each `|` — they should form straight columns.

### Fix a broken table

1. Find the longest text in each column (including the header).
2. Set that column width to `max(length) + 2` (padding).
3. Pad every cell in that column with spaces so pipes align.
4. Rebuild the separator row: `| ` + (`-`.repeat(width-2)) + ` |` for each column, with pipes aligned to the header.

### Example (services table)

```markdown
| Service    | Port | Purpose                                      |
| ---------- | ---- | -------------------------------------------- |
| Kafka      | 9092 | Event streaming (Patient, Encounter, etc.)   |
| Redis      | 6379 | Hot cache for sub-50 ms reads                |
| PostgreSQL | 5432 | Warm store (patients, encounters)            |
```

---

## URLs — no bare links (MD034)

**Do not** paste raw `http://…` or `https://…` in prose, tables, or list items outside fenced code blocks. markdownlint flags them as **MD034**.

### Use a Markdown link

```markdown
See [localhost:8100/health](http://localhost:8100/health) when the gateway is up.
```

Example table (aligned pipes):

| Service | URL |
| ------- | --- |
| Gateway | [localhost:8100](http://localhost:8100) |

Use a short, readable **label** (host + path). The full URL stays in the link target.

### Allowed without a link

- Inside **fenced code** (` ```bash `, ` ```text `): `curl http://localhost:8100/health`
- Host:port **without** a scheme in backticks: `` `localhost:9092` ``
- Env vars in backticks: `` `VITE_API_BASE_URL=http://localhost:8100` ``

---

## Ordered lists (MD029)

After a **code fence** or blank section, markdownlint treats the next list as **new**. Start again with **`1.`**, not `3.` (style `1/1/1`).

````markdown
1. Step one
2. Step two

```bash
./scripts/run_staging.sh
```

1. Step three (restart numbering — not `3.`)
````

---

## Other lint rules (summary)

| Rule                       | Policy                                              |
| -------------------------- | --------------------------------------------------- |
| MD034 bare URLs            | On — use `[label](url)` in prose/tables; URLs OK in fences |
| MD029 ordered list prefix  | On — use `1.` after code blocks / new lists           |
| MD060 table column style   | Off in config — follow aligned tables in this doc   |
| MD013 line length          | Off — technical lines may exceed 80 characters      |
| MD033 inline HTML          | Off — `&lt;` / `&gt;` allowed in docs               |
| MD040 fenced code language | Off — plain ` ``` ` blocks allowed for trees        |
| MD041 first line H1        | Off — README may start with a title paragraph       |

---

## Verify locally

```bash
npx --yes markdownlint-cli2 "README.md" "docs/**/*.md"
```

Run from the repository root. If you re-enable **MD060** in `.markdownlint.jsonc`, use `"style": "aligned"` and fix tables using this guide.

---

## Authors using Cursor / VS Code

- Install the **markdownlint** extension (David Anson).
- It reads `.markdownlint.jsonc` automatically when the workspace root is this repo.
- When editing Markdown, follow the **aligned table** template above.
