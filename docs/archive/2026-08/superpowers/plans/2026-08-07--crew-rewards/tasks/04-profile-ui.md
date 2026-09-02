# Task

Responsive Crew profile, locker and ticket shop.

# Goal

Add `/mi-crew` with a distinctive ROCKY interface for progression, avatar
selection, rewards and history.

# Inputs / prerequisite decisions

- Use existing character PNGs and design tokens.
- Logged-out visitors receive a Shopify login CTA.

# Files likely to change

- `src/components/CrewProfile.jsx`
- `src/components/CrewProfile.test.jsx`
- `src/styles/CrewProfile.css`
- `src/data/crewAvatarImages.js`
- `src/shopify/api.js`
- `src/App.jsx`
- `src/components/NavBar.jsx`
- `src/styles/NavBar.css`

# Detailed changes to make

- Build profile hero, level progress, ticket balance, avatar locker, reward shop
  and recent history.
- Handle loading, logged-out, unavailable and mutation error states.
- Keep buttons accessible and prevent duplicate clicks while saving.
- Link the logged-in account name to `/mi-crew`; keep explicit logout in profile.

# Commands to run

- `npx vitest run src/components/CrewProfile.test.jsx src/App.test.jsx`
- `npm run build`

# Acceptance criteria

- Profile reads and mutations update the UI.
- Locked/owned/equipped states are visually distinct.
- No horizontal overflow at 390px.

# Risks / edge cases

- Missing image mappings fall back to the starter avatar.

# Done evidence to report back

- Component tests, build output and browser screenshots.
