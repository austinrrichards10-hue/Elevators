# Hollow Snow

A third-person shooter set in a frozen, fog-bound forest. The world and enemies are generated in code. Light the three wardfires, reach the altar and defeat the Hollow King.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. Choose a skin and weapon on the title screen or in the pause menu. The Character room on the title screen lets you orbit and zoom around the character to inspect it.

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Left click | Fire |
| Right click | Aim |
| R | Reload |
| 1-5 | Switch weapon |
| Shift | Sprint (the gun is lowered and can't fire) |
| Space | Dodge |
| E | Hold to interact |
| M | Mute |
| ` or F2 | Moderator menu |
| P or Esc | Pause |

## Project layout

```
index.html                 The page that runs the game
models/
  characters/
    doomer-miku-and-teto.js  Player skins: Twin Tails (Miku) and Crimson Curls (Teto)
src/
  game.js        Main loop, controls, HUD, menus and the Character room
  moderator.js   Moderator menu: no enemies, god mode, flying, teleports and more
  player.js      Loads the character models, the skin list (SKINS) and the player rig
  enemies.js     Ghouls and the Hollow King, built in code
  guns.js        Weapon stats and gun models, built in code
  world.js       The snow forest: terrain, trees, mountains, wardfires and altar
  audio.js       All sound effects and music, synthesized in code
  render.js      Lighting, bloom and colour grading
  textures.js    Textures painted in code (snow, bark, fur)
  glb.js         Reads the embedded model files
  style.css      Menus and HUD styling
```

Each file in `models/` is a `.glb` 3D model stored as text, because browsers won't load separate model files from a page opened straight from disk. They can't be edited directly. To change a model, edit the original `.glb` in Blender or a similar tool, then convert it again.

## Credits

Character models: ["Doomer Miku and Teto"](https://sketchfab.com/3d-models/doomer-miku-and-teto-5d99f01932df476dbddfe8e34ace6bbe) by [0x00001337](https://sketchfab.com/0x00001337), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Rescaled, with the cigarette props removed and generated hair bones added for animation. The file is `models/characters/doomer-miku-and-teto.js`.

