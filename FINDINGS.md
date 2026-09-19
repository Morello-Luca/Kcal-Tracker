# Findings

Real issues found and diagnosed while reviewing this codebase, logged as part of ongoing code review practice.

## Bare except hides API failure

*Silent failure / bare except*

**Diagnosis:** There was no raise statement to alert us if the lookup function returns None, which would then crash when we tried to read it in the total_calories function.

**Fix:** Add a raise statement inside the except block, so a failed lookup fails loudly and immediately instead of quietly returning None and crashing two calls later, far from the real cause.

## Retriever returns the worst matches instead of the best

*Sort or ordering bug*

**Diagnosis:** .sort() natively returns in the opposite order to what we want. It sorts ascending by default, so taking the first items after sorting gives the lowest-scoring (worst) matches, not the highest-scoring (best) ones.

**Fix:** Invert the results so we return the best match — use scores.sort(reverse=True), or sorted(scores, reverse=True), so the highest similarity scores come first.

## Silent fallback API key disguises broken auth as working

*Hardcoded secret*

**Diagnosis:** If the real GROQ_API_KEY environment variable is missing, the code doesn't fail or warn — it silently swaps in a fake fallback key and carries on as if everything's fine. Nothing breaks at this point; settings.api_key prints normally. The failure only shows up much later, when an actual API call goes out with the fake key and fails, far from where the real problem started.

**Fix:** Raise an error immediately if the real API key isn't set, instead of silently falling back to a placeholder — fail loudly at startup rather than confusingly at request time.
