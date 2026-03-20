# Contributing

Thanks for improving these samples. Before opening a pull request, run the checks for the language(s) you touch so formatting and basic validation stay consistent.

## Python (`python/`)

Uses [uv](https://docs.astral.sh/uv/). From the `python/` directory:

```bash
uv sync --group dev
```

**Format** (apply fixes):

```bash
uv run ruff format src tests
```

**Format check** (CI-style, no writes):

```bash
uv run ruff format --check src tests
```

**Lint:**

```bash
uv run ruff check src tests
```

You can run formatting, lint, and tests in one go:

```bash
uv run ruff format src tests && uv run ruff check src tests && uv run pytest
```

Configuration lives in `python/pyproject.toml` (`[tool.ruff]`, `[tool.pytest.ini_options]`).

## JavaScript (`javascript/`)

Requires Node.js 20+. From the `javascript/` directory:

```bash
npm ci
```

**Format** (apply fixes):

```bash
npm run format
```

**Format check:**

```bash
npm run format:check
```

**Tests** (Prettier check + `node --check` on every `.js` file under `src/`):

```bash
npm test
```

## TypeScript (`typescript/`)

Requires Node.js 20+. From the `typescript/` directory:

```bash
npm ci
```

**Format** (apply fixes):

```bash
npm run format
```

**Format check:**

```bash
npm run format:check
```


---

If you add a new sample file, put it under the same `src/` layout as existing examples so the glob-based checks still cover it.
