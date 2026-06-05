# LLM Router Improvements

By adding the exception handling and rate-limit detection block inside `PoolRouter.invoke` (`services/llm_router.py`), a highly resilient, self-healing routing mechanism was introduced for the LLM calls. 

Here is exactly what the code is doing and how it changed the system:

### 1. Graceful Fallback (Preventing Crashes)
Before this change, if an LLM provider (like Groq or OpenRouter) had a temporary outage, threw a 500 server error, or timed out, the entire application would crash, and the email would fail to process. 
By wrapping the invocation in a `try/except` and logging the warning, the system now catches the crash, records which model failed (so it appears in logs), and stays alive.

### 2. Smart Rate Limit Detection
LLM providers enforce strict quotas (e.g., "requests per minute"). When you exceed them, they throw an HTTP `429 Too Many Requests` or "Rate limit exceeded" error. The code intelligently scans the error message string to see if the failure was specifically due to a rate limit rather than a random timeout or server error.

### 3. Dynamic "Circuit Breaker" (Bitfield Tracking)
If the code detects a rate limit, it calls `_mark_unavailable`. Because the router is built using a bitfield (`self._available &= ~(1 << index)`), this function instantly toggles that specific model's availability bit to `0`. 
* **The impact:** If Groq rate-limits you, your system instantly "blacklists" Groq for subsequent requests in that cycle, routing all new emails to Gemini or OpenRouter without wasting time trying (and failing) on Groq again.

### 4. Seamless Round-Robin Retry
Instead of returning an error to the user, the `continue` statement immediately jumps back to the top of the `for` loop, grabs the *next* available model in the pool, and tries the prompt again. The client calling the API (or the background email worker) has no idea the first model failed—they just get a successful response a few seconds later.

### Summary of What Was Achieved:
With just these few lines, problems **#2, #3, #4, and #5** from the project roadmap were successfully solved. This code creates a load-balancer that spreads traffic across multiple free LLM tiers and dynamically removes models from the rotation the millisecond they run out of quota, seamlessly falling back to the next available provider.

### 5. Email Thread Pruning and Input Truncation
To protect the LLM context limits and database storage from massive email threads, `email-reply-parser` was added to the `EmailPipelineService`. It intelligently strips out old forwarded history, nested replies, and giant signatures. A generous 15,000-character fallback truncation was also added to ensure that no single message can crash the system or cause database bloat.