# NorthStep scoring server (Edge Function `score`)

Records every roadmap fit score on the server and decides who may see it.
People in the hidden-score test group get no number until their day-21 check-in. If the server cannot be reached, the app hides the number (unknown means hidden).

## Put it live (about 5 minutes, no command line)

1. Supabase dashboard, **SQL Editor**: paste and run `supabase/migration_003_scoring.sql` (adds two helper functions, nothing else).
2. Supabase dashboard, **Edge Functions**, **Deploy a new function**, **Via Editor**.
3. Name it exactly `score`. Replace the sample code with the whole of `supabase/functions/score/index.ts`. Leave **Verify JWT** switched on. Click **Deploy**.
4. Merge the pull request, then hard-refresh the site (Ctrl+Shift+R).

## Check it works

* Sign in as a normal account, make a roadmap. In **Table Editor**, `scores` gets one new row (`kind` = `fit`, `hidden_at_creation` = false).
* To try the hidden group: in SQL Editor run `update app.assignments set holdout = true where user_id = '<the test user id>';`, then make a new roadmap on that account. The page shows "Fit score locked" and the row is saved with `hidden_at_creation` = true. Set it back to `false` afterwards.

## When the calibrated model replaces the demo model

Change `MODEL_VERSION` in `index.ts` so old and new scores are never mixed.
