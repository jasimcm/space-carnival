# Space Carnival — TinkerSpace Kochi

Static site, no build step.

- `index.html` — 16:9 landing page (Dec 19 & 20)
- `badge/` — PCB Badge Design Competition guide, with a 3D build-the-badge lab (`badge/badge3d.js`, three.js)
- `assets/` — artwork, logo, board textures and photos. `assets/carnival/` holds the landing-page art exported from the "Space carnival - 04" Figma file (sky, building, characters, wordmark)

The 3D board and photos come from the 2025 badge, [salmanfarisvp/space-carnival-badge-2025](https://github.com/salmanfarisvp/space-carnival-badge-2025) (MIT): textures are rendered from its Gerbers, part positions from its pick-and-place file.

Live: https://space-carnival-psi.vercel.app — deploy with `npx vercel deploy --prod` from this folder.

## Landing-page toys

`assets/carnival.js` runs the two toys under the hero: **light it up** (wire a battery and switch to TinkerSpace's fairy lights) and **print your ticket** (a downloadable carnival ticket drawn on canvas).

The battery, toggle switch, terminal block and ticket machine are Blender renders. To change them, edit the scripts in `tools/blender/` and, from that folder, run:

    /Applications/Blender.app/Contents/MacOS/Blender -b -P parts.py -- "$PWD/out"
    /Applications/Blender.app/Contents/MacOS/Blender -b -P machine.py -- "$PWD/out"
    python3 gen.py

`gen.py` crops the renders into `assets/carnival/` and prints where each terminal and the ticket slot land, for the coordinates in `index.html`.
