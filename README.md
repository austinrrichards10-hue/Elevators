# Hollow Snow

A third-person survival game in a vast frozen, fog-bound forest. Your plane goes down in the Hollow, a crater the locals call the Death Crater, with walls nobody has ever climbed out of. You're Miku. The intro opens in the cabin, across the table from Teto, before the engine goes up and the door tears away; you're thrown out, crash down through a tree and wake in the snow. The intro and the story's scenes always play through. Find the axe, cut wood, build a fire before the cold takes you, and work out how to get out. Wolves roam the forest. The world is generated in code and stretches a kilometre in every direction from its centre, with mountains around the edge.

The way out was left by Dr. Ilse Varga, a weather scientist stranded here in 1980. She worked out that the Breath, a column of warm air rising from the crater's centre, could carry a hot air balloon over the rim. She hid ten balloon parts at ten sites around the crater, each under a red flag with a page of her journal. Find all ten, bring them and 10 planks to her launch frame at the Breath, and get ready to fly out. This is part one of the story; it ends at the balloon.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. The Character room on the title screen lets you orbit and zoom around the character to inspect it. The game saves itself every time you sit down by a campfire, and **Load last save** on the title screen picks up from there.

| Input | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look around her (free look) |
| Ctrl | Toggle aim lock: she always faces the crosshair |
| Left click | Bow: hold to draw, release to shoot. Axe or blade: swing |
| Right click | Aim the bow (zooms in) |
| 1 / 2 / 3 | Bow / axe / the Ember Blade (once you have it) |
| E | Pick up, read, open, cook, skin, use |
| C | Sit by a campfire to heal quickly and save; C again, or move, to get up |
| Tab | Crafting (then a number to craft) |
| M / J / I | Field book: map, journal, pack. Press again or Tab to close |
| F | Eat or drink the best thing you're carrying |
| Z | Binoculars (once you have them) |
| Shift | Sprint |
| Space | Dodge |
| N | Mute |
| ` or F2 | Moderator menu |
| P or Esc | Pause, with a way back to the main menu |

Arrows fly further the longer you draw, drop with gravity and stick in the snow and the trees.

On the map: click to set a waypoint, scroll to zoom, drag to pan, C to centre on yourself.

## Surviving

- **Warmth** drains away from a fire, over about three and a half minutes. Frost creeps across the screen as it falls, and once it's gone the cold eats your health.
- **The axe** is buried in a tree stump near where you land; it catches the light now and then.
- **Trees** take a few chops to fell and topple away from you. Chop the fallen log to split it into planks.
- **A campfire** costs 5 planks. Stand within a few metres of it to warm up, or sit by it (C) to heal quickly and save the game. You can't sit down in a fight: not for a few seconds after a blow either way, with a wolf charging or close by, or with a hare you're hunting still bolting nearby.
- **Wolves** wander in packs. They'll stop and watch you if you come near, and bolt if you get too close. Once in a long while one charges with a growl; dodge, or hit it with an arrow or the axe to send it running.
- **Wolves** have health now: two arrows or three axe blows. A wounded wolf can only limp, so it's easy to finish off. Skin a dead one for a pelt and meat.
- **Snow hares** are everywhere, still in their brown coats so they stand out on the snow. They freeze, then bolt in zig-zags, and they're easier to get close to if you creep or stand still with the bow up. A full draw drops one; a light shot wounds it and it limps away slowly. Take a hare for meat and a pelt, and cook raw meat at a fire.
- **Gear** cuts how fast the cold gets to you: a parka, fur mittens and a hood crafted from hare pelts, and a wolf-pelt cloak. Snowshoes make you faster.
- **The wreck** comes down somewhere different each run. Its smoke column shows above the treetops. Teto is off its nose, still strapped into her torn-off seat and out cold. Nothing you do wakes her, but light a fire beside her and, once you've found another site or two, she'll come round and wander off on her own.
- **If you die** you can start over or wake by your last campfire, keeping everything you found.

## Finding your way

- **The flight bag**, a few steps from where you land, holds the pilot's chart and a compass. With them you get the map, a minimap and a compass strip.
- **The Ranger Lookout** is close to the start. Climb it to see across the crater and mark every site on your chart. The binoculars and snowshoes are there too.
- **Notes, signposts and Varga's pages** mark more places on the chart as you read them.
- **Beacons** show through the fog: the lookout lamp, the radio mast's red light and the steam column over the Breath.
- **The journal** keeps every page you've read, the sites you've found and the parts you still need.

The ten sites are the Ranger Lookout, Henrik's Cabin, Hollow Station, the Frozen Lake, the Radio Mast, the Dakota, Last Camp, the Frozen Altar, the Chapel of the Snows and the Star-Iron Mine. About 250 things lie around the crater to find: food, warmth, medicine, gear, crates, 32 notes and pages, and 15 star-iron shards.

## The way out

Bring all ten parts and 10 planks to Varga's launch frame at the Breath and press E to assemble the balloon, then again to climb in. Teto has other ideas: she shoots the balloon full of holes, appears right behind you, drags you clear, rockets up into the sky with you and hurls you down through the treetops into a clearing, then drops out of the sky after you. This is the final fight, and it's long and hard.

- **Your scythe.** You tear off your twin tails and forge them into a blue double scythe. Left click whirls it (three times for a combo, ending in a spin). Right click throws it: it spins out like a boomerang in a wheel of fire until it hits Teto or goes far enough, then comes back to your hand, cutting her again if she's in the way. Q fires a beam of light that you aim yourself with the crosshair. It burns her the whole time it's on her and explodes when it ends, but you can barely move while it's up, and if she hits you enough you're still knocked down. Slashes can also cut her homing orbs out of the air.
- **Her gatling hair.** She points, her drills light up with red sights, and then they rattle out tracer rounds. Keep moving sideways or dodge with Space. After each burst she rests for a moment: that's when to hit her, and hits land harder then. Get too close and she whips her hair round you.
- **Her other moves.** She dives at you down a red line drawn on the snow, then reels dizzy where she stops. She throws homing orbs that arc up and come down on you. From two thirds health she leaps up on her jets and slams down where you stand, sending a ring of force rolling out across the snow. From one third she spins in the air and sprays slow bullets in every direction. She can also vanish and reappear right behind you, and from two thirds she drags a laser across the clearing at chest height.
- **Her mega laser.** Every so often from two thirds health she leaps to the far end of the clearing and slams down, throwing boulders across the snow. Then she charges a laser as wide as the whole clearing. Get behind a boulder: the laser boils them away as it fires, and they're gone by the time it ends.
- **Perfect dodges.** Roll through a bullet, an orb, her dive or the slam ring at the last moment and time slows for a beat, giving you some stamina back.
- **Railguns.** Get hit too often and you're knocked down: she charges two railgun beams, the ground cracking under her and under you, and you have to mash Space to roll clear. It takes more presses every time she knocks you down.
- **Her rages.** At two thirds and one third of her health she goes up on her jets, screams, blasts you back across the snow, and turns the sky redder. The music gets harder each time.
- **If you lose**, you go back to your last save (or, with no save yet, the fight starts again from the top).

At the end she goes up on her jets and rains bullets down while you flip and cartwheel clear, then the two of you lock beams in the air. Hers wins. You wake under the snow, hurt, and have to limp all the way back down the clearing to the balloon on your own. You can't climb in until you've built a fire and sat by it. Build a fire and rest by it, and patch the balloon with 5 wolf pelts and 10 hare pelts. Climb in and fly away, and that's the end of part one.

## The Ember Blade

A ten-foot burning katana, hidden from the start. Enter the Konami code (up, up, down, down, left, right, left, right, B, A) or type `hotblade` while playing. Press 3 to hold it. It cuts down every tree and creature in a wide arc, splits fallen logs straight into planks and keeps you warm. The moderator menu can give it too.

## Project layout

```
index.html                 The page that runs the game
models/
  characters/
    doomer-miku-and-teto.js  Miku, the player, and Teto, found at the wreck
  animals/
    wolf.js                  The wolf, with its run, walk, creep, idle and sit animations
  vehicles/
    plane.js                 The plane, flying in the intro and wrecked on the map
  weapons/
    double-scythe.js         Miku's double scythe, for the fight with Teto
src/
  game.js        Main loop, controls, camera, arrows, HUD, menus and the Character room
  cutscene.js    The opening plane crash, and the wreck site it leaves on the map, with Teto's seat
  cabin.js       The plane's cabin for the intro, and the seats in it
  survival.js    The axe and stump, chopping and planks, crafting, campfires and the cold
  wolves.js      The wolves: how they roam, hunt, take damage and die, plus a loader for animated models
  rabbits.js     The snow hares, and the combat checks shared by every weapon
  events.js      Game events that one part announces and others respond to
  lore.js        Every piece of story text: notes, Varga's pages, thoughts, site names, the ending
  story.js       The note reader, the journal page, the objective tracker, site banners and stats
  sites.js       The ten sites and the Breath: placing them, finding them, beacons, the lookout climb
  structures.js  The buildings and props at each site, built in code
  items.js       Everything you can pick up, the pack, eating, cooking, gear and the binoculars
  map.js         The field book, the survey chart, the minimap and the compass strip
  katana.js      The Ember Blade
  crimson.js     Teto by the wreck: checking on her, warming her, and her wandering off
  balloon.js     Varga's balloon: the launch frame, assembly, the launch and the ending
  showdown.js    Teto's ambush at the balloon, the fight in the clearing, and the end of part one
  save.js        Saving at campfires, and loading from the title screen
  moderator.js   Moderator menu: flying, no cold, give items, teleports and more
  player.js      Loads the character models, the skin list (SKINS) and the player rig
  boots.js       Black tactical boots, shaped from the characters' own feet
  bow.js         The bow and arrow models, built in code
  world.js       The snow forest: terrain, trees and mountains, built in tiles around the player
  audio.js       All sound effects and music, synthesized in code
  render.js      Lighting, bloom and colour grading
  textures.js    Textures painted in code (snow, bark, fur)
  glb.js         Reads the embedded model files
  style.css      Menus and HUD styling (each module above also has its own .css where it needs one)
```

Each file in `models/` is a `.glb` 3D model stored as text, because browsers won't load separate model files from a page opened straight from disk. They can't be edited directly. To change a model, edit the original `.glb` in Blender or a similar tool, then convert it again.

## Credits

Character models: ["Doomer Miku and Teto"](https://sketchfab.com/3d-models/doomer-miku-and-teto-5d99f01932df476dbddfe8e34ace6bbe) by [0x00001337](https://sketchfab.com/0x00001337), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Rescaled, with the cigarette props removed and generated hair bones added for animation. The file is `models/characters/doomer-miku-and-teto.js`.

Wolf: ["Wolf with Animations"](https://sketchfab.com/3d-models/wolf-with-animations-f3769a474a714ebbbaca0d97f9b0a5a0) by [3DHaupt](https://sketchfab.com/dennish2010), licensed under [CC BY-NC-SA 4.0](http://creativecommons.org/licenses/by-nc-sa/4.0/). Textures scaled down and unused ones removed. The file is `models/animals/wolf.js`. Its licence doesn't allow commercial use, so the game can't be sold while it includes this model.

Plane: ["RAF Voyager Aeroplane (Private Plane)"](https://sketchfab.com/3d-models/raf-voyager-aeroplane-private-plane-750e92f1cf7e4fb5b8e78c91a0253648) by [Foggy_123](https://sketchfab.com/foggy_123), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Only its colour textures are kept, scaled down. The file is `models/vehicles/plane.js`.

Scythe: ["Double Scythe"](https://sketchfab.com/3d-models/double-scythe-c6db4ad9ef0042d8935e9e54dc37b21d) by [EVAI](https://sketchfab.com/Evvvai), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Only its geometry is kept; the game colours it blue. The file is `models/weapons/double-scythe.js`.
