# Hollow Snow

A third-person survival game in a vast frozen, fog-bound forest. Your plane goes down over the northern range; you're thrown clear and wake in the snow. Find the axe, cut wood, build a fire before the cold takes you, and track down the wreck by its column of smoke. Wolves roam the forest. The world is generated in code and stretches a kilometre in every direction from its centre, with mountains around the edge.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. Choose a skin on the title screen or in the pause menu. The Character room on the title screen lets you orbit and zoom around the character to inspect it.

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look around her (free look) |
| Ctrl | Toggle aim lock: she always faces the crosshair |
| Left click | Bow: hold to draw, release to shoot. Axe: swing |
| Right click | Aim the bow (zooms in) |
| 1 / 2 | Bow / axe |
| E | Pick up |
| Tab | Crafting (then a number to craft) |
| Shift | Sprint |
| Space | Dodge; skips the intro |
| M | Mute |
| ` or F2 | Moderator menu |
| P or Esc | Pause, with a way back to the main menu |

Arrows fly further the longer you draw, drop with gravity and stick in the snow and the trees.

## Surviving

- **Warmth** drains away from a fire, over about three and a half minutes. Frost creeps across the screen as it falls, and once it's gone the cold eats your health.
- **The axe** is buried in a tree stump near where you land; it catches the light now and then.
- **Trees** take a few chops to fell and topple away from you. Chop the fallen log to split it into planks.
- **A campfire** costs 5 planks. Stand within a few metres of it to warm up.
- **Wolves** wander in packs. They'll stop and watch you if you come near, and bolt if you get too close. Once in a long while one charges with a growl; dodge, or hit it with an arrow or the axe to send it running.
- **The wreck** comes down somewhere different each run. Its smoke column shows above the treetops. Another survivor lies in the snow beside it.

## Project layout

```
index.html                 The page that runs the game
models/
  characters/
    doomer-miku-and-teto.js  Twin Tails (Miku), the player, and Crimson Curls (Teto), found at the wreck
  animals/
    wolf.js                  The wolf, with its run, walk, creep, idle and sit animations
  vehicles/
    plane.js                 The plane, flying in the intro and wrecked on the map
src/
  game.js        Main loop, controls, camera, arrows, HUD, menus and the Character room
  cutscene.js    The opening plane crash, and the wreck site it leaves on the map
  survival.js    The axe and stump, chopping and planks, crafting, campfires and the cold
  wolves.js      The wolves and how they roam, plus a loader for animated models
  moderator.js   Moderator menu: flying, no cold, give items, teleports and more
  player.js      Loads the character models, the skin list (SKINS) and the player rig
  boots.js       Black tactical boots, shaped from the characters' own feet
  bow.js         The bow and arrow models, built in code
  world.js       The snow forest: terrain, trees and mountains, built in tiles around the player
  audio.js       All sound effects and music, synthesized in code
  render.js      Lighting, bloom and colour grading
  textures.js    Textures painted in code (snow, bark, fur)
  glb.js         Reads the embedded model files
  style.css      Menus and HUD styling
```

Each file in `models/` is a `.glb` 3D model stored as text, because browsers won't load separate model files from a page opened straight from disk. They can't be edited directly. To change a model, edit the original `.glb` in Blender or a similar tool, then convert it again.

## Credits

Character models: ["Doomer Miku and Teto"](https://sketchfab.com/3d-models/doomer-miku-and-teto-5d99f01932df476dbddfe8e34ace6bbe) by [0x00001337](https://sketchfab.com/0x00001337), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Rescaled, with the cigarette props removed and generated hair bones added for animation. The file is `models/characters/doomer-miku-and-teto.js`.

Wolf: ["Wolf with Animations"](https://sketchfab.com/3d-models/wolf-with-animations-f3769a474a714ebbbaca0d97f9b0a5a0) by [3DHaupt](https://sketchfab.com/dennish2010), licensed under [CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/). Textures scaled down and unused ones removed. The file is `models/animals/wolf.js`. Its licence doesn't allow commercial use, so the game can't be sold while it includes this model.

Plane: ["RAF Voyager Aeroplane (Private Plane)"](https://sketchfab.com/3d-models/raf-voyager-aeroplane-private-plane-750e92f1cf7e4fb5b8e78c91a0253648) by [Foggy_123](https://sketchfab.com/foggy_123), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Only its colour textures are kept, scaled down. The file is `models/vehicles/plane.js`.
