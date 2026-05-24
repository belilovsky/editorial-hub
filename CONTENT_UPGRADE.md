# Editorial Hub content upgrade

Source reviewed: `/Users/belilovsky/Downloads/__1.md` (1963 lines, 206 KB).

## Consensus findings

- The previous `data.js` was an early shell, not a production editorial policy.
- The highest-risk gaps were sourcing, anonymous sources, fact-check workflow, corrections/takedowns, AI/synthetic media, UGC verification, RU/KZ parity, elections, minors/trauma/suicide, legal-review triggers, conflicts and sponsored content.
- Several recommendations repeated across independent audit blocks, so v1.1 prioritizes those shared P0/P1 items.

## Implemented in v1.1

- Added explicit section titles and upgraded metadata to `version: 1.1`, `langs: ["ru","kk"]`, `status: "release-candidate · legal review"`.
- Added scope, ownership, review cycle and applicability across site, social, video, captions, thumbnails, live and archives.
- Added risk tiers: low, medium, high, red.
- Added Kazakhstan-focused legal-review triggers without pretending to replace legal advice.
- Rewrote sourcing and anonymous-source rules with public-interest, direct-knowledge, motive and approval requirements.
- Rewrote fact-check workflow with evidence file, right of reply and RU/KZ parity checks.
- Added UGC, visual verification, provenance and graphic-content rules.
- Rewrote AI policy with approved use cases, banned uses, synthetic media, disclosure and audit log.
- Added corrections, takedowns, cross-platform correction and archive notes.
- Added conflicts, gifts, outside work and recusal.
- Added sponsored/branded/partner/grant-funded content firewall.
- Added aggregation, plagiarism, attribution and press-release rules.
- Added children, vulnerable groups, trauma, suicide/self-harm and help-contact verification rules.
- Added Kazakhstan election playbook: balance, silence period, polls, comments and paid political content.
- Added health/science/statistics evidence hierarchy.
- Added RU/KZ workflow, source-of-truth language, quote translation, glossary and corrections parity.
- Added accessibility, methodology, archive/changelog and reusable templates.
- Added public-request workflow without inventing a fake inbox.
- Added Kazakh short policy summary, daily editorial checklists and wording examples.

## Code/UI fixes made during the content pass

- Fixed a data/render contract mismatch: `app.js` expected `section.title`, while `data.js` did not provide it.
- Added a defensive `titleOf(section)` fallback so future missing titles do not render as `undefined`.
- Removed duplicate navigation labels caused by a CSS `::before` label plus the real `.nav-link-text`.
- Bumped static asset query strings to `20260524f`.

## Needs external validation

- A Kazakhstan media lawyer should validate exact article references, election restrictions, response/oprovержение timings and takedown wording before this policy becomes the final legal-facing production document.
- Contact channels for public corrections, complaints and right-of-reply requests are not yet wired because the project is a static shell and no official inbox was provided.
