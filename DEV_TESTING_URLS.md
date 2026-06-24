# Studio Las OS - testing URLs

## Current test URL

Use only this URL for current Studio Las OS v15 / OS 9.0 testing:

https://trenermedycznywarszawa.github.io/studio-las-v15/studio-management-os-3.0.html

Cache-busted test URL for this build:

https://trenermedycznywarszawa.github.io/studio-las-v15/studio-management-os-3.0.html?build=20260624-clients-write-v1

## Archived URL

`studio-las-v14` is archival for this phase. Do not use it for Supabase read/write tests:

https://trenermedycznywarszawa.github.io/studio-las-v14/studio-management-os-3.0.html

## Working version

`studio-las-v15` is the working repository and GitHub Pages source for the current Studio Las OS 9.0 Supabase Write Preview.

## Console version check

Open DevTools Console on the v15 URL and run:

```js
window.STUDIO_LAS_VERSION
window.STUDIO_LAS_BUILD
window.STUDIO_LAS_REPO_EXPECTED_URL
window.STUDIO_LAS_DATA_SOURCE
```

Expected values for this checkpoint:

```js
window.STUDIO_LAS_VERSION
// "Studio Las OS 9.0 Supabase Write Preview"

window.STUDIO_LAS_BUILD
// "2026-06-24-CLIENTS-WRITE-V1"

window.STUDIO_LAS_REPO_EXPECTED_URL
// "https://trenermedycznywarszawa.github.io/studio-las-v15/studio-management-os-3.0.html"
```

If the console warns that the current URL does not contain `/studio-las-v15/`, stop the test and open the current test URL above.
