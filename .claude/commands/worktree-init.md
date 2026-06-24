---
allowed-tools: Bash(git:*), Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Bash(basename:*), Bash(pwd:*), Bash(sed:*)
argument-hint: task 1 | task 2 | task 3
description: Create parallel worktrees for multi-task development with Ghostty panels
---

# Worktree Parallel Init

Create multiple git worktrees for parallel development: $ARGUMENTS

## Instructions

### Step 1: Validate Environment

1. Check this is a git repo: `git rev-parse --is-inside-work-tree`
2. Get repo name: `basename $(git rev-parse --show-toplevel)`
3. Get main branch: `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'` — default to `main`
4. Ensure working tree is clean: `git status --porcelain`. If dirty, warn and ask.
5. Fetch latest: `git fetch origin`

### Step 2: Parse Tasks

Parse tasks from `$ARGUMENTS` separated by `|`.

If empty, use AskUserQuestion to ask for tasks.

For each task:
- Generate kebab-case branch: `wt/<kebab-case-task>` (max 50 chars)
- Generate worktree path: `../worktrees/<repo-name>/wt-<kebab-case-task>`

### Step 3: Create Worktrees

For each task:

1. `mkdir -p ../worktrees/<repo-name>`
2. `git worktree add -b wt/<name> ../worktrees/<repo-name>/wt-<name> origin/<main-branch>`
3. Write `.worktree-task.md` in the new worktree:
   ```markdown
   # Worktree Task
   **Branch:** wt/<name>
   **Task:** <task description>
   **Created:** <ISO date>
   **Source repo:** <path to main repo>
   ```

### Step 4: Check Dependencies

If `Patristica/package.json` exists, note that each worktree needs `cd Patristica && npm install`.

### Step 5: Output Summary

```
| # | Task | Branch | Path |
|---|------|--------|------|
| 1 | ... | wt/... | ../worktrees/repo/wt-... |
```

Ready-to-copy commands for Ghostty panels:

```
# Panel <N>: <task>
cd <absolute-path-to-worktree> && claude
```

Remind: `Cmd+D` to split panel in Ghostty. After finishing, `/worktree-deliver` then `/worktree-cleanup --all`.
