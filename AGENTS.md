<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep `/` as the MovieVerse presentation page; the three catalogues remain separate at `/films`, `/manga`, and `/occidental` so visitors explicitly enter the experience.
- Keep the entire user-facing experience in French and force catalogue requests to `fr-FR` so stored legacy preferences cannot switch languages.
- Keep user guidance on the dedicated `/aide` route so the cinematic home remains visual and uncluttered.
- Gemini keys are pooled per feature via `src/lib/gemini-keys.ts` (chat / vision / reviews), each pool ending with the shared `GEMINI_BACKUP_KEY` then legacy `GEMINI_API_KEY`; on a 429 the next key in the pool takes over, so new keys are added by naming convention, never hardcoded.
