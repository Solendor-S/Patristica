---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(rm:*), Bash(cat:*), Bash(pwd:*), Bash(ls:*)
description: Commit, push, and create PR from the current worktree
---

# Worktree Deliver

Commit all work, push, and create a pull request from the current worktree.

## Instructions

You are inside a worktree. Package up the work and deliver it as a PR.

### Step 1: Validate Environment

1. Verify this is a worktree (not the main working tree) using `git worktree list`
2. Get current branch: `git branch --show-current`
3. Verify branch follows `wt/*` pattern. If not, warn and ask if they want to continue.
4. Read `.worktree-task.md` if it exists to get the original task description

### Step 2: Review Changes

1. Run `git diff --stat` and `git diff --cached --stat`
2. Run `git status --short`
3. If no changes at all, inform the user and stop.

### Step 3: Clean Up Task File

```bash
rm -f .worktree-task.md
```

### Step 4: Confirm Files to Commit

Use AskUserQuestion to show what will be committed. Options:
- "Stage all changes"
- "Let me choose"

### Step 5: Stage and Commit

1. Stage confirmed files with `git add`
2. Determine commit type: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
3. Show proposed commit message with AskUserQuestion
4. Create commit using HEREDOC:
   ```bash
   git commit -m "$(cat <<'EOF'
   <commit message>
   EOF
   )"
   ```

### Step 6: Push

```bash
git push -u origin HEAD
```

### Step 7: Create Pull Request

```bash
gh pr create --base main --title "<PR title>" --body "$(cat <<'EOF'
## Summary

<bullet points>

## Original Task

<task from .worktree-task.md>

## Changes

<git diff --stat summary>

---
Created from worktree `wt/<name>` using `/worktree-deliver`
EOF
)"
```

Display the PR URL.

### Step 8: Next Steps

Tell the user: after merging, run `/worktree-cleanup` from the main repo.
