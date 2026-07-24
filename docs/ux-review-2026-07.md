# UX Review — July 2026

**Method:** full Playwright harness walk (96 stills: 390×844 light/dark, 375×667 SE, 440×956 installed-PWA simulation), three independent screen-by-screen review passes, a hands-on interactive pass (selection, time entry, undo, import errors, map, themes, demo mode, dialogs), and code audit. Findings are ranked by likely impact on festival-day experience, not implementation cost.

---

## Fixed in this pass

### The installed-app layout bug (from Robbie's screenshots)
Every screen showed ~59pt of dead space below the header **only in the installed PWA**. Root cause: the `Screen` scaffold double-counted `safe-area-inset-top` (the TopBar already absorbs it). Same bug existed in the menu back-header, and the demo banner rendered *behind* the iOS status bar. All fixed; safe-area usage now flows through `--safe-top/--safe-bottom` CSS vars, and the screenshot harness gained a **standalone-sim pass** (injected insets) plus a scrolled Bands frame so this whole bug class is visible in contact sheets from now on.

Also real (not a bug): Safari and the installed app have **separate storage** on iOS — picks made in Safari don't appear in the installed app. Documented in `docs/install.md`.

### Interaction & feedback smalls (all landed)
- **Bands:** removed the "Stage & time pending" line repeated on all 183 cards (one shared status line instead); Unplugged acts now show their **day** too; result count reads "183 sets"; sticky header got a bottom border; sticky letter headers got an opaque backing (no more text-on-text while scrolling); A–Z rail is height-capped so **every letter is reachable on an iPhone SE** (it used to clip at ~O); letter jumps no longer land underneath the sticky header.
- **Chips everywhere:** selected-state fill now uses a dark-mode-legible token (was near-invisible navy-on-navy); tapping a half-clipped chip scrolls it fully into view; Group's chip row fades on both edges.
- **Map:** Stages/Entrances filters start explicitly ON (the "Stages" chip used to be an invisible no-op that actually *hid entrances* when toggled); time slider announces "5:45 PM" instead of "1065" to screen readers.
- **Now:** "Meetups --" → real 0; empty "Next Up" now routes to Bands when nothing's picked ("No plan yet — start by picking your bands") and to import when bands exist but times don't; hero shrinks on short screens so the CTA clears the fold.
- **Schedule:** header's unlabeled upload/download glyph pair → one labeled "Import / Export" button; miss-filter chips and time-clear buttons hit 36×/32× targets.
- **Settings:** theme picker exposes radio semantics; the OFF switch track is neutral in dark mode (was saturated blue = read as ON).
- **Consistency & copy:** third priority tier is "Maybe" everywhere (was Optional/Maybe mix); "Must-See" hyphenation unified; Shared sets says "2 picked this" (was "2 going" over undecided people); crew label is pronoun-free; demo screen drops "production" jargon; emergency intro de-duplicated; meetup duration is "(3 hr 57 min)" so a wrap never leads with "·".
- **Trust & safety:** global **error boundary** (a render crash now shows a branded reload screen instead of permanent blank); "Reset schedule/map" rows styled as destructive like "Reset all"; dead `share` menu route removed; update toast clears the home indicator.

---

## Majors — ranked, awaiting approval

### 1. Band cards don't advertise selection (the core loop)
**Problem:** Selection happens only inside the detail sheet ("Add to my bands"). On the list, nothing looks tappable-for-selection — the leading music-note circle reads as decoration, and a first-run user facing 183 cards gets no hint of the app's core action.
**Why:** Picking bands is the app's longest and most important session; the affordance gap slows every single pick (tap → sheet → add → close ×40).
**Fix:** A tappable star on each card's right edge: empty → selected (pink, default "Want"), long-press or second tap opens the sheet for priority. Keeps the sheet for details, makes bulk picking one-tap.

### 2. Map collisions: friend pins, stage labels, zoom FABs
**Problem:** Co-located friends stack (the 3.2% fan-out is ~half an avatar at default zoom — a hidden friend is misinformation); adjacent stage labels merge ("BeatBox Ghost", "DoorDash Verizon"); the +/− FABs cover the legend's water/first-aid entries.
**Why:** "Where is everyone / which stage is that" is the sunlight-panic use case the map exists for.
**Fix:** Cluster co-located friends into one stacked-avatar chip with a count (expand on tap); alternate label anchors above/below for near neighbors; dock the FAB stack above the legend block.

### 3. Bands sticky chrome eats ~47% of an SE screen
**Problem:** While scrolling, title row + search + chips + nav leave ~2.5 cards visible per screenful on a 667pt phone.
**Fix:** Collapse the "My Bands" title row once scrolling starts (keep search + chips); optionally tighten card padding at short viewports.

### 4. Group "By Person" hides the third person
**Problem:** Horizontal columns at ~70% width — Morgan is fully off-screen with no pager, fade, or peek cue; looks like a two-person feature.
**Fix:** Snap-scrolling columns + avatar pager chips (R/A/M) above; tapping an avatar scrolls that column into view.

### 5. Preview time reads as real time
**Problem:** Off-festival, the Now dashboard simulates Saturday ("Jimmy Eat World in 3 hr 5 min") with only a quiet "Planning view" subtitle — while the countdown says the festival is a day away.
**Fix:** Active "Previewing Saturday — exit" pill + thin yellow banner (the pattern Demo Mode already uses); suffix simulated relative times with "(preview)".

### 6. Undecided "?" vocabulary
**Problem:** The same state renders as a bare "?" (Group), "Undecided" chip (My Day) — and it isn't tappable anywhere.
**Fix:** One "maybe" badge everywhere; make it a tap-to-cycle (going → maybe → out) on My Day rows. (Copy side already improved: "picked this".)

### 7. Smaller follow-ups
- A–Z rail drag-to-scrub (letters now all fit, but scrub beats precision taps).
- Collapse identical "Not at the first set yet" crew rows into one line until statuses diverge; use "You" for the active user.
- Emergency text says "meetup at Lobos 1707 (4:59 PM)" while Meetups shows a 4:10–4:27 window — verify the leave-by math and label the time ("arrive by").
- Dark-mode `empty-group` art has a baked light frame → regenerate frameless (art pass).

---

## Verified clean (don't "fix")
- Standalone shell after the fix: header under status bar, nav under home indicator, 440px width, sticky behavior — all correct.
- Import flow: invalid codes get a friendly specific error; preview-before-commit + undo both work.
- Priority control uses proper radiogroup semantics; confirm dialogs are `alertdialog` with danger styling; focus is trapped in sheets and Escape closes.
- Time entry: native pickers save instantly, undo works, status flips only when stage+time are both set (correct semantics).
- 46/46 unit tests, 0 console errors across all 96 stills.
