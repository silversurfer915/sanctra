# AI availability repair — October 8, 2026

Live worker logs captured a Gemini generation HTTP 404 while successful replies were observed with the configured model; additional live requests returned HTTP 400. The chat previously masked provider failures as generic temporary unavailability.

- Preserve the runtime admin model override. If it returns 404 or explicitly rejects model/JSON support, make one fallback attempt with gemini-3.5-flash-lite. Do not retry credential failures or change the admin's saved preference.
- Use one shared 35-second generation deadline, one daily message reservation, and record each actual provider attempt and model in usage accounting.
- Set the worker deployment default to gemini-3.5-flash-lite, verified directly against Gemini with JSON generation. A direct provider check reported gemini-2.5-flash-lite retired for new users; it is not used as the fallback.
- Preserve safe gateway errors in the chat; raw internal exceptions remain hidden.
- No changes to timer, authentication, groups, entitlement rules or general-chat policy.

Validation: 25 focused gateway/admin/assistant/error tests passed. Recovery tests also verify the actual per-attempt usage records. 14 server-timer regression tests passed. Production build and focused lint passed. Broader AI/manual/timer run: 75 passed, seven pre-existing failures in legacy Firebase AI Logic tests (outdated defaults and disabled API); legacy cleanup remains deferred.

Deployed Worker version: c7e2a5fd-f33a-4db6-aca1-4aa490b6c929.
Firebase Hosting deployment completed; production entry asset verified as /assets/index-CotyxLhL.js.

Live post-deployment verification: chat replies succeeded, Enter sent messages, and an October 9 Physics 10:00–10:30 request produced one matching proposal. The proposal was left unapplied. Screenshot: live-chat.png. The earlier generic 400 failure was not reproduced after diagnostic logging was added; future failures log only safe categories/status/model, without provider messages, prompts or credentials.
