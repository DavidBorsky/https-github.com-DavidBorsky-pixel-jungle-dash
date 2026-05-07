# Pixel Jungle Dash

Pixel Jungle Dash is a complete original side-scrolling browser platformer built with plain HTML, CSS, and JavaScript. It features three handcrafted jungle levels, an original explorer character, enemies, hazards, checkpoints, a portal finish, score tracking, lives, health, a timer, pause, restart, and game-over flows.

## Play Online

- Game link: Play Pixel Jungle Dash Here ((http://127.0.0.1:5500/pixel-jungle-dash/index.html)l)

## Features

- Play directly in a desktop or laptop browser with no build step
- Smooth platforming movement with gravity, jumping, collision detection, and camera scrolling
- Three original jungle stages with increasing difficulty
- Start menu, instructions screen, pause state, level-complete screen, and game-over screen
- Score, gems, lives, health, and timer HUD
- Simple original pixel-art inspired visuals rendered with canvas shapes
- Lightweight synthesized sound effects created in JavaScript with Web Audio
- Static hosting friendly for GitHub Pages, Netlify, and Vercel

## Controls

- Move left: `A` or `Left Arrow`
- Move right: `D` or `Right Arrow`
- Jump: `Space`, `W`, or `Up Arrow`
- Pause: `P`
- Restart run: `R`

## Local Setup

Because this is a static project, you can run it in a few simple ways:

1. Open `index.html` directly in a browser.
2. Or serve the folder locally with any static server.

Example using Node:

```bash
npx serve .
```

Then open the local URL shown in the terminal.

## Deployment

### GitHub Pages

1. Push the `pixel-jungle-dash` folder contents to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
4. Select branch `main` and folder `/ (root)`.
5. Save and wait a few minutes for the site to publish.

### Netlify

1. Create a new site from your repository.
2. Use these settings:
   Build command: none
   Publish directory: `.`
3. Deploy the site.

### Vercel

1. Import the repository into Vercel.
2. Choose the project root as the `pixel-jungle-dash` folder if needed.
3. Leave the framework preset as `Other`.
4. Leave the build command empty and set the output directory to `.` if prompted.
5. Deploy.

## File Structure

```text
pixel-jungle-dash/
├── index.html
├── README.md
├── styles.css
└── src/
    └── game.js
```

## Notes

- No copyrighted characters, brand names, sprites, music, or borrowed gameplay assets are included.
- Sound effects are generated at runtime and do not depend on external audio files.
- The project is intentionally dependency-free to keep publishing simple.
