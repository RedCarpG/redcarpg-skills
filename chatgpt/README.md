# ChatGPT packaging

This directory holds *distribution metadata and a runtime guard*, not a second copy of the Skills. The canonical sources remain `skills/<name>/SKILL.md`, with their `references/` and `assets/`.

## Compatibility contract

- `manifest.json.compat` lists platforms the author intends to distribute to. Add `"chatgpt-chat"` only after reviewing that Skill for use in ordinary ChatGPT chat.
- `manifest.json.runtime["chatgpt-chat"].level`: `full` or `partial`. `partial` means conceptual guidance is usable, but some operations require tools unavailable in ordinary chat. No auto-granted privileges are implied.
- Skills without the `chatgpt-chat` tag are **not packaged**. This means *not yet approved for this distribution*, not necessarily fundamentally incompatible.
- A tagged Skill must have the matching runtime level; `--chatgpt` fails if the declaration is missing.

## Build and install

```bash
node scripts/package.mjs --chatgpt
node scripts/package.mjs --chatgpt multi-session-dev immersive-cultural-ui
```

The output is `dist/redcarpg-chat-skills-<plugin-version>.zip`. It includes only marked Skills, canonical `SKILL.md` with an injected ChatGPT runtime guard, `references/`, `assets/`, and the plugin manifest. It omits runnable `scripts/`, evaluation cases, per-skill READMEs and manifests. The canonical source is not edited. The existing `node scripts/package.mjs` command still builds individual ZIPs as before.

Upload the ZIP using the ChatGPT Plugin Creator or update the existing private plugin with it. Publishing the ZIP produces a **snapshot**; GitHub commits do not automatically update an installed plugin. Inspect the generated archive and test in an ordinary ChatGPT conversation before promoting a release.

Keep private repository lessons, environments, credentials and other private files out of a public-distribution build.
