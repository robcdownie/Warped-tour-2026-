# Completion checklist (acceptance tests §37)

Legend: **auto** = covered by `npm test` and/or `npm run verify` (headless Chromium); **device** = final confirmation on a real iPhone in Safari (Chromium can't reproduce every iOS Safari quirk — do these once before the show).

## Offline
1. Open the app online once — **device**
2. Complete offline setup — **device** (Offline Test all green)
3. Airplane Mode — **device**
4. Force-close — **device**
5. Reopen from Home Screen — **auto** (offline reload w/ SW controlling) + **device**
6. Refresh — **auto** + **device**
7. Navigate all five tabs — **auto** (all 5 tabs offline) + **device**
8. Open & zoom the map — **device**
9. Select an artist — **auto/device**
10. Edit a schedule assignment — **auto** (schedule persists) + **device**
11. Close & reopen again — **auto/device**
12. Confirm all data remains — **auto** (data survives reload / offline) + **device**

## Artists
13. Every Saturday artist appears once — **auto** (`seed.test.ts`)
14. Every Sunday artist appears once — **auto**
15. Saturday/Sunday filters work — **device** (Bands filters)
16. Unplugged appearances separate from main — **auto**
17. Shared artists don't duplicate records — **auto**

## Schedule
18. Assign an artist to each of the 9 stages — **device** (editor) / engine **auto**
19. Export the schedule — **auto**
20. Import on a clean database — **auto**
21. Import a second time — **auto**
22. No duplicates — **auto** (re-import updates in place)
23. Detect a same-stage overlap — **auto** (editor warns) 
24. Detect a personal schedule conflict — **auto** (`conflicts.test.ts`, e2e must-see overlap)
25. Detect insufficient travel time — **auto**

## Friends
26. Export Robbie's selections — **auto**
27. Import them as friend data — **auto**
28. Import Ari and Morgan — **device** (same flow) / mechanism **auto**
29. View all three in Group Schedule — **device** (Group timeline)
30. Update an existing friend import without duplication — **auto**

## Map
31. Stage pins aligned on different iPhone sizes — **auto** (percentage anchoring; captured at 390×844 and 375×667) + **device**
32. Zoom & pan while pins stay attached — **device** (counter-scaled markers)
33. Create a manual custom check-in — **auto** (check-in persists) + **device**
34. Reopen offline, check-in remains — **auto** (check-in persists offline)
35. Calibrate a map marker — **device** (Calibration mode)
36. Export & re-import coordinates — **device** (mechanism = same codec, **auto**)

## Meetups
37. Create a 30-minute shared opening — **auto** (`meetups.test.ts`)
38. Confirm a meetup is suggested — **auto**
39. Create a conflict with a Must-See band — **auto**
40. Confirm the meetup doesn't interrupt it — **auto** (never-interrupt-must-see test)
41. Suggested location considers the next stages — **auto** (next-stage-aware test)

## Error handling
42. Import invalid JSON — **auto** (rejected with friendly error)
43. Import an unsupported version — **auto** (`codec.test.ts` version check)
44. Remove internet during loading — **device** (app shell renders from cache first)
45. Useful error without crashing — **auto/device** (empty/error states, no blank screens)

## Run it

```bash
npm test        # 41 unit tests
npm run verify  # 19 real-browser checks incl. offline airplane-mode
```

Then do the **device** rows once on an actual iPhone (see [offline-testing](offline-testing.md)).
