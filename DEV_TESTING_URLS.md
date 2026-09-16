# Studio Las OS — testing URLs

## Production runtime

Use this address only after migration `012_security_hardening.sql` and both current Supabase test files have passed in the target project:

`https://trenermedycznywarszawa.github.io/studio-las-v15/studio-las-os.html`

Expected runtime conditions:

- the page title is `Studio Las OS`,
- the login requires a Supabase Auth account,
- missing or invalid production configuration stops the application,
- recognized historical Studio Las `localStorage` keys stop the application,
- failed Supabase writes are shown as failures and are not saved locally.

Console configuration check:

```js
window.STUDIO_LAS_CONFIG.mode
// "production"

window.STUDIO_LAS_CONFIG.supabase.url
// the approved HTTPS Supabase project URL
```

Do not print access tokens, refresh tokens, client records, or health data in the console.

## Isolated demo

`https://trenermedycznywarszawa.github.io/studio-las-v15/demo/studio-las-os-demo.html`

Expected demo conditions:

- a permanent red DEMO banner is visible,
- only fictional records are displayed,
- no production configuration script is loaded,
- no Supabase request is made,
- changes disappear after reload,
- no `localStorage` or `sessionStorage` data is created by the demo runtime.

## Legacy migration gate

`https://trenermedycznywarszawa.github.io/studio-las-v15/studio-management-os-3.0.html`

This historical URL must display only the retirement/migration page. It must not execute the former application.

The page links to the explicit browser-data export tool:

`https://trenermedycznywarszawa.github.io/studio-las-v15/tools/export-legacy-browser-data.html`

The export file may contain sensitive data. Never upload it to GitHub or public storage.

## Required Supabase validation

In a disposable/test project run:

1. migrations `001–011`,
2. `supabase/dev/seed_test_data.sql`,
3. `supabase/migrations/012_security_hardening.sql`,
4. `supabase/tests/012_security_hardening_audit.sql`,
5. `supabase/tests/012_security_role_tests.sql`.

Do not use real client health/process data merely because the static page loads successfully.
