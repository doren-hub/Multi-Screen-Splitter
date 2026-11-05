# Multi-Screen-Splitter project instructions

## Existing project context and commands

- This is a React 19 / TypeScript / Vite app for multi-monitor wallpapers, with a Google Gemini integration. Preserve application behavior during management-only changes.
- Preserve the existing README and its AI Studio link and local setup instructions. README prerequisites: Node.js; install with `npm install`; configure `GEMINI_API_KEY` yourself; start with `npm run dev`. Preview a production build with `npm run preview`.
- `package.json` originally defines only `dev`, `build`, and `preview`: there is no unit-test suite or dedicated lint script. Use `npm run build` as the configured test/smoke check and `npx --no-install tsc --noEmit` as the configured static check; do not claim these are unit tests or ESLint.
- Use Node.js 22 for verification. Install dependencies with `npm install --ignore-scripts --no-package-lock`; the project has no committed lockfile. Dependency resolution is consequently not frozen.
- Never read credentials, `.env*`, or `auth.json`. Verification must run without API credentials or live Gemini calls. Vite loads environment files implicitly: do not run a build in a checkout containing `.env*` files.

## Delivery and ownership

- Follow `.cursor/rules/common.mdc` if it exists. No such file or pre-existing repository AGENTS.md, generated workflow document, or kurukuru configuration existed at onboarding.
- Use `codex/<short-description>`. The Desktop AI that starts an issue leads its implementation after the human gate. The owner controls merge authority; the owner explicitly authorized the normal PR/review/merge workflow for onboarding #2.
- Start with an empty commit and a Draft PR beginning with `Closes #<issue>`. Move its task card to Doing when an applicable project card exists (none was attached to onboarding #2 at kickoff).
- Before Ready, record summary/background, main changes, tests/static checks and results, limitations and review notes; retain the closing issue reference and refresh changed verification results.
- Run independent Claude Opus 5.5 low effort review via `kurukuru review`, with Read/Glob/Grep only. Keep Draft until a standalone `OK` for the exact head; reuse the same session for re-review.
- Record local verification timestamps, duration, head SHA, commands and exit codes. After Ready, invoke `kurukuru ci-wait` once per reviewed head and wait for its final summary. Merge only on exit 0, using the exact reviewed head. Exit 4 does not authorize merging here. On failure keep Ready, fix, rerun local checks, re-review in the same session, then wait again.
- If the caller records ai-dispatch-log, do not duplicate start, finish or attachment commands. Otherwise follow the global recording rules: `ai-dispatch-log start --task ... --instruction ... --kind ...`, then at completion `ai-dispatch-log finish --id <id> --result ...` and `ai-dispatch-log codex-attach --id <id>`. Kinds: smoke, design, review, implement, usage, discuss, other.
- Never recursively launch `kurukuru run`, `exec`, `queue`, or `batch`. Never register CI runners or bypass permissions.

## Onboarding #2 scope

- Work only in the independent onboarding clone. Never change `/Users/doren/Developer/Multi-Screen-Splitter`, never register the clone, and do not start other issues.
- Preserve unique existing generated-document content before regeneration; include preserved content and replacements as reviewable PR diffs.
- Finish onboarding only after its PR is merged. Tell the owner to fast-forward the original checkout when safe, then run `kurukuru repos add /Users/doren/Developer/Multi-Screen-Splitter`.
