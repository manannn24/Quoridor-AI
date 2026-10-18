# Contributing to Quoridor AI

Thank you for contributing to the Quoridor AI project. This guide outlines the required workflow and standards for all human contributors to maintain high code quality, stability, and clean Git history.

---

## 1. Core Rule: Protect `main`

> [!IMPORTANT]
> **Never work directly on `main`, and never push directly to `main`.**
> `main` is our stable, production-ready, verified release branch. All changes—regardless of size—must be proposed via a Pull Request (PR) from a dedicated task branch.

Direct pushes and force pushes to `main` are restricted.

---

## 2. Branch Naming Convention

All branches must adhere to the following naming pattern:

```text
<person-name>/<short-feature-or-task-name>
```

### Rules:
- All lowercase, using hyphens (`-`) instead of spaces or underscores.
- The prefix before `/` identifies the contributor using a short, personal handle (e.g., `manan` for Manan Jain, `manthan` for Manthan Bumb). Collaborators may choose another lowercase short personal prefix if preferred.
- The part after `/` describes the specific feature, fix, or task.

### Examples:
- `manan/add-contributor-workflow`
- `manan/fix-wall-placement`
- `manthan/improve-tournament-results`
- `manthan/add-mcts-metrics`

---

## 3. Step-by-Step Contributor Workflow

1. **Sync with Latest `main`:**
   Always start your work from an up-to-date `main` branch:
   ```bash
   git switch main
   git pull --ff-only origin main
   ```
2. **Create a Dedicated Task Branch:**
   ```bash
   git switch -c <person-name>/<short-task-name>
   ```
   *(Replace `<person-name>` and `<short-task-name>` with your actual name prefix and task description.)*
3. **Focused Development:**
   Keep tasks small and scoped to a single feature or bug fix. Avoid scope creep or unrelated refactoring.
4. **Run Local Checks Regularly:**
   Execute tests during development. Before committing and pushing, always run:
   ```bash
   npm run check:all
   ```
   If modifying AI agents, arena logic, tournament evaluation, or search heuristics, run the benchmark suite (`npm run benchmark`) and check if report files were changed before committing.
5. **Inspect Diff and Stage Selectively:**
   Review your changes:
   ```bash
   git status --short
   git diff --check
   ```
   **Do NOT use `git add .` indiscriminately.** Stage only the specific intended files:
   ```bash
   git add <specific-files>
   ```
   Never commit `.env` files, secrets, local configuration, `node_modules/`, `dist/`, or temporary files.
6. **Commit with Meaningful Messages:**
   Use light Conventional Commits format (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`):
   ```bash
   git commit -m "fix: resolve pawn jump collision edge case"
   ```
7. **Push Your Task Branch:**
   ```bash
   git push -u origin <person-name>/<short-task-name>
   ```
8. **Open a Pull Request:**
   Target base branch `main`. Fill in the PR template in full: describe the problem, proposed solution, verification commands, and UI screenshots if visual elements changed.
9. **CI Verification & Code Review:**
   Wait for automated CI checks (`npm run check:all`) to pass. Address any reviewer feedback by committing further updates to your task branch.
10. **Merge via Pull Request:**
    Once approved and CI checks pass, merge using the repository merge button. Delete the remote task branch after merging. Never delete local safety backup branches.
11. **Post-Merge Cleanup:**
    Sync your local repository and safely delete your merged local task branch:
    ```bash
    git switch main
    git pull --ff-only origin main
    git branch -d <person-name>/<short-task-name>
    ```

---

## 4. Copy-Paste Quick Reference

```bash
git switch main
git pull --ff-only origin main
git switch -c <person-name>/<short-task-name>

# ... Make focused changes and test ...

git status --short
git diff --check
npm run check:all
git add <specific-files>
git commit -m "feat: implement requested change"
git push -u origin <person-name>/<short-task-name>
```

*(Note: Replace `<person-name>` and `<short-task-name>` with your actual values.)*

---

## 5. Project Modes & Scope

The Quoridor AI platform is organized around three verified core modes:
1. **🎮 Human vs AI:** Play against Minimax, Alpha-Beta, Greedy, or MCTS agents with full move validation, path blocking checks, undo turn, and decision metrics.
2. **⚔️ AI vs AI Arena:** Side-by-side agent battleground featuring independent algorithm selection, heuristic configuration, cycle repetition detection, and live step-by-step playback controls.
3. **🏆 Tournaments:** Automated round-robin and head-to-head match runner with strict side rotation, win-rate breakdown, decision telemetry, and JSON/CSV report exports.

### Scope Boundaries:
- **Modular Heuristics:** Presets $H_0$ (Baseline shortest path), $H_1$ (Distance differential), $H_2$ (Wall-aware evaluation), and $H_3$ (Composite) remain available as internal AI evaluation settings within Arena and Tournament agent configurations.
- **Retired UI:** The standalone Heuristic Laboratory UI is retired. Do not reintroduce it without an explicit architectural and product decision.

---

## 6. Useful Commands

| Command | Purpose |
|---|---|
| `npm ci` | Clean, reproducible dependency installation using `package-lock.json` |
| `npm run dev` | Launch local Vite development server |
| `npm run typecheck` | Run strict TypeScript validation (`tsc --noEmit`) |
| `npm run lint` | Run ESLint across code and test files |
| `npm run test` | Run Vitest unit and integration test suite |
| `npm run build` | Produce optimized production bundle in `dist/` |
| `npm run check:all` | Complete pipeline validation (`typecheck` + `lint` + `test` + `build`) |
| `npm run benchmark` | Run reproducible CLI tournament and emit JSON/CSV reports to `reports/` |

> [!NOTE]
> Running small benchmark smoke tests verifies functional execution and connectivity, but is not statistically definitive proof of AI strength. Substantive evaluation requires larger tournament sample sizes.
