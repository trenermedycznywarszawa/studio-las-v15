# Knowledge Library → Studio Las OS: trainer decision support

**Status:** integration proposal for owner review; no production deployment or data import.
**Base:** Architecture 10 (provenance), 12 (source integrity), 18 (guidance loop), and Master Prompt v1.1.
**Decision supported:** at PWD, during 12-week adaptation, or at Review, help Damian find a relevant source and its limits before making his own decision.

## What is being connected

The local Studio Las Knowledge library contains original materials and AI-produced analysis cards. Its current inventory includes about 95 active cards; analysis status “do weryfikacji” means Damian has not approved the claims. A private administrative document removed from the active library must not enter OS exports. No original PDF, full text, personal client data, or copyright-restricted content is published through a static page.

### One example

For a return-to-movement PWD, a search for “ból, obawa przed ruchem” may return SLK-000076, “Zrozumieć ból”. Show its usefulness alongside its limitation: this presentation is a communication aid, not a basis for identifying a pain mechanism or issuing a diagnosis. This is an unreviewed analysis of a source, not clinical approval. Damian may create a separate trainer interpretation or decision with a reference to the exact source version.

## User journey

1. Damian opens the trainer workspace at PWD, adaptation, or Review and asks a short question.
2. The search returns at most a few cards with title, source identity, source locator where available, immutable hash/version, relevant passage or **paraphrased** note, limitations, OCR/extraction quality, and review status.
3. A card labeled `needs_review` can be inspected, but cannot be silently treated as an approved recommendation. Broken or ambiguous provenance is excluded from decision use.
4. Damian may choose an exact card/version as **context considered**, then separately records his observation, interpretation, and decision. The card cannot populate a client plan, release, or report automatically.
5. Any client-facing material is a separate `client_material` version with full `derived_from` lineage. It passes the exact-version approval and deliberate publication gate in Architecture 10.

A manual path remains available: Damian can search the local library himself and enter the exact source reference during review.

## Technical boundary for the first integration

- Search and source contents run behind a trainer-authenticated server endpoint, with authorization checked on every read. Browser UI visibility alone is not authorization.
- OS sends no client name, health note, case history, or identifier to the local knowledge search. The trainer types a generic question; references are selected afterward inside the authenticated client process.
- Search results include only allowlisted metadata and short licensed/permitted excerpts or paraphrases. Do not copy the source archive or 95-card JSON into static OS HTML, JavaScript, public assets, URLs, logs, or client tables.
- Source identity and exact version/hash are retained. The source artifact remains separate from extraction, AI summary, and trainer meaning. A claim in a source is not independently verified fact.
- A decision-to-source association is a versioned reference and purpose, not an assertion that the source caused or validates the decision.
- Access is denied to anonymous users and clients by server policy, with a tested cross-role denial. Client portal data projections never return the result or trainer's private reasoning.
- A local Windows-only library cannot be queried by the hosted OS on another device or when the local server is off. A production integration needs a separately approved, secured synchronization/hosting model. No silent upload of originals.

## Release conditions before application code or production use

1. Identify the currently deployed OS repository, branch, backend project, and trainer authorization mechanism. The v15 main HTML still has localStorage fallback and client/trainer modes in one static document; it is not enough to infer production security.
2. Obtain an approved source profile for the library import and a precise list of licensed/authorized content. Explicitly exclude SLK-000048 and its copies in backups and earlier exports.
3. Confirm source-card status, original hash, quality of OCR/extraction, and owner review criteria; no bulk “approve all”.
4. Implement read-only trainer endpoint and server-side access controls, then test anonymous and client denial, trainer read, corrupt provenance rejection, and absence of client data in search requests.
5. Implement a small trainer-only OS search component, with exact source links and limitations, and verify no source data or draft is exposed by client UI, raw page source, assets, or API.
6. Connect selected sources to a trainer-owned decision by exact-version references, without automatic recommendations, plan changes, or publication.
7. Run staging smoke tests with synthetic cases; release only after security, data, and privacy gates for the actual runtime.

## Not in scope

No AI medical interpretation of client data, diagnostic output, automatic 12-week plan, source-wide embedding index, bulk publication, client-facing bibliography, or production migration in this proposal.

## Evidence and assumptions

- Studio Las Knowledge analysis JSONs generated in the 2026-09-22 library cleanup carry SLK IDs, SHA-256, source names, summaries, and limitations; they are unreviewed.
- `studio-management-os-3.0.html` on v15 main is a large static page and still includes localStorage fallback. The currently deployed runtime may differ; verify it before implementation.
- Connected Supabase access currently lists staging and os9-test projects, not a confirmed production OS project. This proposal does not assert production access.
