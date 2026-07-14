# SnooDrop - Subreddit Merge Game

SnooDrop is an immersive, physics-based 2D merge game built on the Reddit Developer Platform (Devvit). Players drop Reddit-themed elements (Upvotes, Comments, Posts, Awards) into a container and merge identical items to create higher-tier elements, aiming to unlock the ultimate Cosmic Reddit Master trophy.

---

## 🎮 Core Gameplay & Environment Features

1. **Reddit Merge Physics**: Mechanics inspired by classic merge games, optimized with Matter.js physical bodies.
2. **Synchronized Daily Runs**: Every 24 hours, a globally synchronized sequence of drops is generated from a daily seed, providing a 100% fair and skill-based competition.
3. **Subreddit War & Raids**: Players contribute their score to their subreddit's global war standing. They can spend their score to "Raid" rival subreddits, deploying obstacle traps (Downvote traps) directly into their rivals' gameplay containers.
4. **Subreddit User Flair**: Merging elements up to Tier 12 (Cosmic Reddit Master) unlocks custom glowing User Flairs like `🌌 Transcendent Master` or `🥇 Legendary Merger` awarded directly to their Reddit profile in the subreddit.
5. **Interactive Player Profile Card**: A sleek, card-based HUD displaying:
   - Reddit username.
   - Highest unlocked badge (Bronze, Silver, Gold, Cosmic) with a prominent glowing label.
   - Active Top 10 Daily Streak.
   - High score (Personal Best).
   - Global rank and percentile standing.
   - Interactive badge rack summarizing all unlocked milestones.
6. **Multi-Filter Leaderboards**:
   - **Today**: Top daily scores showing score counts and current streaks side-by-side.
   - **Streaks**: Players ranked by consecutive days maintaining a spot in the daily top 10.
   - **Global**: All-time high scores.
   - Includes a sticky **Your Standing** footer at the bottom of the list for immediate ranking feedback.

---

## ⚙️ Performance & UX Optimizations

- **Prioritized Preloading**: The game loads only immediate assets (Tiers 1-5 and logo) at startup to launch the lobby instantly. Advanced tiers (Tiers 6-12) are loaded in the background while the player navigates the menu, reducing initial boot delay by 60%.
- **Dropper Auto-Center**: To prevent accidental drops, the dropper automatically centers itself after every drop. If the mouse does not move, subsequent items drop from the center. Move/drag gestures > 5px automatically resume tracking.
- **Mobile-First Responsiveness**: Responsive scaling ensures a seamless visual HUD layout across mobile touchscreens and desktop viewports. On mobile, touch inputs drop items immediately at the tapped location for precise gameplay.
- **Audio Mute/Unmute**: A global audio toggle button (`🔊` / `🔇`) in the game sidebar (desktop) and header (mobile) lets players toggle Web Audio synthesis on and off. The selection is preserved across sessions using `localStorage`.

---

## 🛠️ Technology Stack

- **Client Frontend**: [Phaser 2D Game Engine](https://phaser.io/) (with Matter.js physics), Vite (bundling), TypeScript, and Vanilla CSS.
- **Server Backend**: Node.js Serverless environment via [Devvit Platform APIs](https://developers.reddit.com/) (Redis, Reddit API).
- **Communication Protocol**: [Hono HTTP Router](https://hono.dev/) on the Devvit server handling score submissions, profile initializations, raids, and flairs.

---

## 💻 Commands & Development

Ensure you have Node.js v22+ installed.

### Setup & Run
1. **Initialize App**:
   ```bash
   npm install
   ```
2. **Start Playtest / Live Development**:
   ```bash
   npm run dev
   ```
   *This starts the Devvit playtest server, allowing you to load and test the game live on a sandbox Reddit post.*

3. **Deploy Code**:
   ```bash
   npm run deploy
   ```
   *Runs type-checks, lints, and uploads the compiled bundle to Reddit's dev platform.*

4. **Launch for Review**:
   ```bash
   npm run launch
   ```
   *Deploys and submits the application to the Reddit App Store.*

### Developer Utilities
- `npm run type-check`: Validates TypeScript build types.
- `npm run lint`: Checks styling and linter rules.
- `npm run login`: Authenticates your command line with your Reddit developer credentials.
- `npm run test`: Runs test suite.
