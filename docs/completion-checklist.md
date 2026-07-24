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

## Data trust (July 2026 pass — see [trust-states](trust-states.md))

46. Saturday reports empty / partial / complete independently of Sunday — **auto**
47. A day with one entered set reports **partial**, not loaded — **auto**
48. Partial schedules never produce a confident free-time claim — **auto** (UI copy check) + **device**
49. Selected sets with no time appear as unknown, not omitted — **device** (My Day)
50. **Mark Day Complete** flips a partial day and is reversible — **auto**
51. A friend with no imported plan is excluded from group math — **auto**
52. An import carrying zero picks still counts as "not imported" — **auto**
53. Every imported friend shows freshness (and goes stale after 12h) — **auto**
54. A fresh check-in outranks the planned position — **auto**
55. A stale check-in falls back to the plan, kept only as history — **auto**
56. Marker state is readable without relying on opacity — **device**
57. Every conflict names both artists in title, message and buttons — **auto**
58. Schedule source, revision and freshness are visible — **auto** + **device**
59. The map stays "reference layout" until verified in Map Setup — **device**
60. Calibration is unreachable with map editing off — **device**
61. An unknown stage in a code is refused with a readable sentence — **auto**
62. An impossible clock time is refused — **auto**
63. Nothing is partially imported when validation fails — **auto**

## First run

64. Clearing local data shows the welcome flow before the tabs — **auto**
65. Choosing Ari makes Ari the active local profile — **auto** + **device**
66. Offline setup uses the real checks, not a claim — **auto**
67. **Pick My Bands** lands on Bands; **Import From Robbie** lands on Friends — **device**
68. An import can't silently replace personal selections — **auto** (preview shows removals)
69. Reopening does not replay onboarding — **auto**
70. **Restart Welcome Guide** replays it without deleting data — **device**
71. Every onboarding screen fits an iPhone SE with no dead end — **auto** (render matrix)
72. VoiceOver, large text, dark mode, airplane mode — **device**

## Run it

```bash
npm test        # 122 unit tests
npm run verify  # 80 real-browser checks: Chromium + WebKit, SE + 16 Pro Max,
                # light + dark, standalone safe-area sim, offline airplane-mode
```

`npm run verify` also runs in CI and **gates the deploy** — a build that can't
reopen offline, or that renders a partial schedule as complete, never reaches
the phones.

Then do the **device** rows once on an actual iPhone (see [offline-testing](offline-testing.md)).

### Physical-device pass before festival day

On all three actual iPhones: install from Safari → reopen from Home Screen →
force-close → Airplane Mode → reboot the phone → scan a QR offline → restore a
backup → receive an app update without losing data.
