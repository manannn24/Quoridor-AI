# Instructions for AI Coding Agents

This document defines strict operational guidelines and constraints for any AI coding assistant (including Antigravity, GitHub Copilot, Cursor, Claude Code, etc.) operating on the Quoridor AI repository.

> [!IMPORTANT]
> This policy is mandatory. Repository host settings, branch protection rules, and human oversight remain authoritative and supersede any instructions given in an agent prompt.

---

## 1. Branching & Git Discipline

- **Never modify `main` directly:** Do NOT make commits directly on `main`, and never push directly to `main`.
- **Start from clean, latest `main`:** Every task must branch from an up-to-date `origin/main`.
- **Branch naming pattern:** Follow the mandatory format `<person-name>/<short-task-name>` (e.g., `manan/fix-wall-collision`, `manthan/add-mcts-eval`).
- **Protect user work:** If uncommitted or untracked changes exist in the working directory, do NOT switch branches, reset, stash-and-forget, clean, or overwrite them. Pause and request explicit human instructions.
- **No destructive Git commands:** Never execute `git reset --hard`, `git clean -fd`, force-checkout, `git push --force`, or branch deletion without explicit human approval.
- **Never publish backup refs:** Never push local safety branches (such as `backup/mcts-strength-heuristic-tuning`) or unrelated local branches to the remote.

---

## 2. Planning & Scope Control

- **Preflight inspection:** Before making changes, inspect repository status, recent commits, and documentation (`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, and relevant files in `docs/`).
- **Formulate a clear plan:** Form a specific plan before modifying code.
- **Strictly scoped changes:** Only touch files directly required for the assigned task. No opportunistic refactoring, unsolicited cosmetic changes, or speculative "improvements".
- **Preserve core systems:** Preserve Quoridor game rules, movement logic, jump mechanics, wall placement rules, BFS/A* pathfinding, Minimax/Alpha-Beta pruning, Greedy baseline, MCTS rollout policies, modular heuristic evaluation ($H_0$–$H_3$), cycle detection, tournament scoring, determinism, and export functionality unless the task explicitly instructs modifications.
- **Do not reintroduce retired UI:** The standalone Heuristic Laboratory UI is intentionally retired. Do not reintroduce it without an explicit user instruction.
- **Minimize dependencies:** Do not add third-party dependencies without clear justification and user approval.

---

## 3. Verification & Testing Integrity

- **Never fabricate results:** Never assume or state that a test, build, or check passed without executing the command and verifying the actual output.
- **Comprehensive validation:** Run `npm run check:all` (`typecheck`, `lint`, `test`, `build`) before committing.
- **UI modifications:** Run automated unit/integration tests (`tests/ui.test.tsx`, `tests/arenaAndTournament.test.tsx`). Note that DOM/jsdom tests do not constitute full pixel-level visual validation; request manual browser verification when appropriate.
- **Engine/AI modifications:** Add or update deterministic unit tests when modifying rules, pathfinding, or AI agents. Check whether benchmark scripts write or modify files before executing them.

---

## 4. Security, Secrets & Clean History

- **No credentials or secrets:** Never commit API keys, personal access tokens, passwords, private keys, SSH keys, or OAuth credentials.
- **No local machine paths:** Avoid hardcoding absolute local paths (e.g., `C:\...` or `D:\...`).
- **Clean staging:** Inspect `git status --short` and `git diff --check` before committing. Stage only intended files. Avoid blind staging (`git add .`).
- **Conventional commits:** Use clear, descriptive commit messages conforming to Conventional Commits (e.g., `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).

---

## 5. Completion Reporting Requirements

Upon completing any task, the AI agent must report:
1. **Branch name & commit hash(es)** created or updated.
2. **Files modified, added, or removed** with brief rationale for each.
3. **Exact verification commands run** and their concrete outcomes (pass/fail).
4. **Verification limitations** (e.g., automated tests passed, but manual browser inspection recommended).
5. **Remaining risks or caveats**, if any.
6. **PR status or URL**, if a pull request was created.
