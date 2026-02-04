# What ESLint Can Enforce Beyond Formatting/Type Safety

## 1. Architectural Boundaries

This is one of the strongest uses of ESLint in large TS monorepos.

**Examples:**

- "This folder/package may only import from these other packages."
- "No imports from @pkg/internal/* outside the package."
- "UI layer cannot import from DB layer."
- "Only packages/api can import @minimal-rpg/db."
- "No cross-package relative imports (../../other-package/...)."
- "Enforce public API usage (must import from package root, not deep paths)."

**How it's done:**

ESLint rules can inspect every import/require and block patterns. Commonly via existing plugins:

- `eslint-plugin-import` - import hygiene, cycles, unresolved, restricted paths
- `eslint-plugin-boundaries` - explicit layer/module boundaries
- `eslint-plugin-etc` / `eslint-plugin-unicorn` - various structural constraints
- Or with a custom rule tailored to your workspace

## 2. Dependency Policy

You can enforce:

- Allowed/forbidden dependencies per package
- "No undeclared deps" (imported modules must be in that package's package.json)
- "Only devDeps allowed in test files"

This is partially ESLint (`import/no-extraneous-dependencies`) and partially better handled by dedicated tools (see below).

## 3. Detecting Too Many Connections Between Packages

You can get partway with ESLint:

- Forbid imports from a long list of packages, or require imports to go through a single "facade" module
- Enforce a strict layering model so "connections" are inherently limited

But counting connections (e.g., "this package imports from >N other packages") is not a typical ESLint pattern because ESLint evaluates files more than whole-program graphs (though it can be done with a custom rule + caching across files, it's awkward).

For "how connected is this package" and "is the dependency graph getting messy," you usually want **dependency graph tools**:

- **dependency-cruiser** - rules about dependency direction, forbidden edges, cycles, path patterns; also produces graphs
- **madge** - circular dependency detection and graphs
- **Nx module boundary rules** (if you're on Nx) - very strong monorepo boundary enforcement
- **knip** - unused exports/files/dependencies (helps trim coupling)
- **ts-prune / ts-unused-exports** - similar class; ecosystem varies

## 4. Enforcing Design Patterns and Codebase Conventions

**Examples:**

- "All errors must extend AppError."
- "All logging must use logger.*, never console.*."
- "No direct fetch usage - must go through apiClient."
- "Database access only allowed via repository layer."
- "No process.env outside config module."
- "All feature flags must be checked via isEnabled() helper."

ESLint is very good at this via:

- `no-restricted-imports`
- `no-restricted-globals`
- Custom rules that match specific AST patterns

## 5. Security and Correctness Patterns

With the right plugins:

- Taint-ish patterns (limited but useful)
- Dangerous API usage
- Regex DoS patterns (some tooling)
- Unsafe async patterns
- Forgotten await, floating promises, misused void (often via @typescript-eslint rules)

## 6. Complexity / Maintainability Constraints

- Max file length / function length
- Cyclomatic complexity
- Nesting depth
- "Don't use any / don't use non-null assertions" etc.

## Direct Answers to Specific Examples

### "Checking if code is all contained in one package"

If you mean "a package should not reach into other packages except through allowed public entrypoints," then yes:

- Block cross-package relative imports
- Block deep imports into another package's internals
- Enforce "only import from @scope/pkg (root), not @scope/pkg/src/..."

ESLint can do this very well.

If you mean "a package must be fully self-contained (no imports from other packages at all)", that's also straightforward: forbid all non-relative imports except a whitelist (or forbid @scope/* imports).

### "Checking if the package is performing a lot of connections to other packages"

ESLint can enforce allowed connections and disallowed connections. But "a lot" is usually better done by dependency graph tooling (dependency-cruiser/Nx) or a CI script that computes counts and fails if thresholds are exceeded.

## Practical Recommendation for a TS Monorepo

- Use **ESLint** for hard policy (boundaries, forbidden imports, layering)
- Use **dependency-cruiser / Nx** for graph-level architecture (cycles, forbidden directions, "this domain can't depend on that domain", reporting on coupling)
- Use **knip** for dead code/unused exports/dependencies (reduces accidental coupling)

If you tell me whether you're on Nx/Turbo/pnpm-only and how your packages are named (e.g., @minimal-rpg/*), I can sketch a concrete rule set that enforces "public API only" and "domain boundaries," plus a separate graph check for "too connected."
