# Adding more users

The app ships with Robbie, Ari, and Morgan. To add a fourth friend:

## Edit the seed

`src/data/users.ts`:

```ts
export const SEED_USERS: User[] = [
  { id: 'robbie', name: 'Robbie', initials: 'R', avatar: null, colorKey: 'pink' },
  { id: 'ari',    name: 'Ari',    initials: 'A', avatar: null, colorKey: 'blue' },
  { id: 'morgan', name: 'Morgan', initials: 'M', avatar: null, colorKey: 'orange' },
  { id: 'jordan', name: 'Jordan', initials: 'J', avatar: null, colorKey: 'teal' }, // add this
];
```

- `id` — lowercase, no spaces, **stable forever** (it's how their shared picks are matched). Don't reuse an existing id.
- `colorKey` — one of `pink`, `blue`, `orange`, `teal`, `yellow`, `purple` (defined in `src/data/users.ts` → `COLOR_VALUES`).
- `avatar` — leave `null`; photos are added on-device.

Bump `SEED_VERSION` in `src/data/seed.ts`, run `npm test`, commit & push.

## Profile photos

Each person can add their own photo on their phone: **Menu → Friends & Sharing → tap the camera badge** on their avatar. Photos are stored locally as data URLs — no uploads, no accounts. (We never generate fake photos of real people.)

## Which person is “me”

On each phone: **Menu → Friends & Sharing → “This device is …”** picks the active profile. That person's picks are the ones you edit; the others are imported by QR/code.
