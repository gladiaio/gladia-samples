# Contributing

Thanks for improving these samples. Before opening a pull request, run the checks for the language(s) you touch so formatting and basic validation stay consistent.

## Python (`python/`)

Uses [uv](https://docs.astral.sh/uv/). From the `python/` directory:

```bash
uv sync --group dev
```

**Format** (apply fixes):

```bash
uv run ruff format
```

**Lint:**

```bash
uv run ruff check 
```

You can run formatting, lint, and tests in one go:

```bash
uv run ruff format && uv run ruff check 
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

If you add a new sample file, put it under the same layout as existing samples (`core-concepts/` or `examples/` in each language folder) so the glob-based checks still cover it.