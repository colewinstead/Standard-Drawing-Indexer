# Issue tracker: GitHub

Issues and specs live in colewinstead/Standard-Drawing-Indexer.
Use the gh CLI from this clone.

- Verify the target before creating issues: `gh repo view --json nameWithOwner`.
- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open`.
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Close: post the explanation, then run `gh issue close <number>`.

Use native GitHub sub-issues and issue dependencies when available.
Otherwise put `Part of #<parent>` or `Blocked by: #<number>` at the
top of the child issue body. Work is unblocked when all blockers close.

When a skill says to publish to the issue tracker, create a GitHub issue.
When it says to fetch a ticket, read the corresponding GitHub issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**
