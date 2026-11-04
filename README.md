# Frostmourne

A third-person survival game in a vast frozen, fog-bound forest. Your plane goes down in the Hollow, a crater the locals call the Death Crater, with walls nobody has ever climbed out of. You're Miku. The intro opens in the cabin, across the table from Teto, before the engine goes up and the door tears away; you're thrown out, crash down through a tree and wake in the snow. The intro and the story's scenes always play through. Find the axe, cut wood, build a fire before the cold takes you, and work out how to get out. Wolves roam the forest. The world is generated in code and stretches a kilometre in every direction from its centre, with mountains around the edge.

The way out was left by Dr. Ilse Varga, a weather scientist stranded here in 1980. She worked out that the Breath, a column of warm air rising from the crater's centre, could carry a hot air balloon over the rim. She hid ten balloon parts at ten sites around the crater, each under a red flag with a page of her journal. Find all ten, bring them and 10 planks to her launch frame at the Breath, and get ready to fly out. This is part one of the story; it ends at the balloon.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. The Character room on the title screen lets you orbit and zoom around the character to inspect it. The game saves itself every time you sit down by a campfire, and **Load last save** on the title screen picks up from there. The title screen shows Miku and Teto (the image is in `assets/title.jpg`) with its own piano theme. Out in the forest you hear the wind in layers, gusts whistling through the pines and ice cracking far off, under a slow, lonely piano; Teto's fight keeps its own music.

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
| P | In Tokyo: her phone. Elsewhere: pause |
| Esc | Pause, with a way back to the main menu |

Arrows fly further the longer you draw, drop with gravity and stick in the snow and the trees.

On the map: click to set a waypoint, scroll to zoom, drag to pan, C to centre on yourself.

## Surviving

- **Warmth** drains away from a fire, over about three and a half minutes. Frost creeps across the screen as it falls, and once it's gone the cold eats your health.
- **The axe** is buried in a tree stump near where you land; it catches the light now and then.
- **Trees** take a few chops to fell and topple away from you. Chop the fallen log to split it into planks.
- **A campfire** costs 5 planks. Pick it from the crafting list (Tab) and a ghost of it follows you, green where it fits and red where it doesn't; click to set it down, R to turn it, right click to cancel. Stand within a few metres of it to warm up, or sit by it (C) to heal quickly and save the game. You can't sit down in a fight: not for a few seconds after a blow either way, with a wolf charging or close by, or with a hare you're hunting still bolting nearby.
- **Wolves** wander in packs. They'll stop and watch you if you come near, and bolt if you get too close. Once in a long while one charges with a growl; dodge, or hit it with an arrow or the axe to send it running.
- **Wolves** have health now: two arrows or three axe blows. A wounded wolf can only limp, so it's easy to finish off. Skin a dead one for a pelt and meat.
- **Wolves move like wolves**: their legs keep pace with the ground at any speed, they lean into turns and slow for tight ones instead of spinning on the spot, follow the slope they're on, steer round trees, and turn and slink off rather than backing away.
- **Snow hares** are everywhere, still in their brown coats so they stand out on the snow. They freeze, then bolt in zig-zags, and they're easier to get close to if you creep or stand still with the bow up. A full draw drops one; a light shot wounds it and it limps away slowly. Take a hare for meat and a pelt, and cook raw meat at a fire.
- **Gear** cuts how fast the cold gets to you: a parka, fur mittens and a hood crafted from hare pelts, and a wolf-pelt cloak. Snowshoes make you faster.
- **The wreck** comes down somewhere different each run. Its smoke column shows above the treetops. Teto is off its nose, still strapped into her torn-off seat and out cold. Nothing you do wakes her, but light a fire beside her and, once you've found another site or two, she'll come round and wander off on her own.
- **Day and night.** A day lasts twelve minutes. The sun rises and sets, dusk glows gold, and the night is dark and full of stars. Nights are colder, and the wolves are bolder.
- **Hunger and thirst** run down over time. Eat what you hunt and find (F picks the best thing). Sit by a fire to melt snow and drink. Let either run out and it hurts.
- **A tent** (8 planks, 2 hare pelts) is somewhere to sleep through the night: press E by it. It keeps the wind off too.
- **A log cabin** (40 planks) is a home of your own, with a stone hearth to warm up and save by. Inside, the top of the walls is cut away so you can see. Press B to decorate it with a bed (to sleep in), fur rugs, a table and chairs, lanterns, a bookshelf, a potted pine, a painting, a teal banner, a pile of furs, crates and stools; X picks the nearest thing up again. It all saves.
- **If you die** a death screen lets you respawn at your last save (or, with no save yet, by your last campfire) or go back to the main menu.

## Finding your way

- **The flight bag**, a few steps from where you land, holds the pilot's chart and a compass. With them you get the map, a minimap and a compass strip.
- **The Ranger Lookout** is close to the start. Climb it to see across the crater and mark every site on your chart. The binoculars and snowshoes are there too.
- **Notes, signposts and Varga's pages** mark more places on the chart as you read them.
- **Beacons** show through the fog: the lookout lamp, the radio mast's red light and the steam column over the Breath.
- **The journal** keeps every page you've read, the sites you've found and the parts you still need.

The ten sites are the Ranger Lookout, Henrik's Cabin, Hollow Station, the Frozen Lake, the Radio Mast, the Dakota, Last Camp, the Frozen Altar, the Chapel of the Snows and the Star-Iron Mine. About 250 things lie around the crater to find: food, warmth, medicine, gear, crates, 32 notes and pages, and 15 star-iron shards.

## The way out

Bring all ten parts and 10 planks to Varga's launch frame at the Breath and press E to assemble the balloon, then again to climb in. Teto has other ideas: she shoots the balloon full of holes, appears right behind you, drags you clear, rockets up into the sky with you and hurls you down through the treetops into a clearing, then drops out of the sky after you. This is the final fight, and it's long and hard.

- **Your scythe.** You tear off your twin tails and forge them into a blue double scythe. Left click whirls it (three times for a combo, ending in a spin). Right click throws it: it spins out like a boomerang in a wheel of fire until it hits Teto or goes far enough, then comes back to your hand, cutting her again if she's in the way. Q fires a beam of light in the teal of her hair that you aim yourself with the crosshair: a summoning circle wheels open at the scythe's tip, rings of sound race down the beam, and glowing music notes spiral along it and burst off where it lands. It burns her the whole time it's on her and explodes when it ends, but you can barely move while it's up, and if she hits you enough you're still knocked down. Slashes can also cut her homing orbs out of the air.
- **Her gatling hair.** She points, her drills light up with red sights, and then they rattle out tracer rounds. Keep moving sideways or dodge with Space. After each burst she rests for a moment: that's when to hit her, and hits land harder then. Get too close and she whips her hair round you.
- **Her other moves.** She dives at you down a red line drawn on the snow, then reels dizzy where she stops. She throws homing orbs that arc up and come down on you. From two thirds health she leaps up on her jets and slams down where you stand, sending a ring of force rolling out across the snow. From one third she spins in the air and sprays slow bullets in every direction. She can also vanish and reappear right behind you, and from two thirds she drags a laser across the clearing at chest height.
- **The arena.** Snow banks and ridges climb away from the clearing into the forest, with ice crystals jutting from the snow, red veins under the floor and a ring of jagged peaks far off; low mist and embers drift through. It all answers to Teto: as she gets angrier the veins burn brighter, the crystals and peaks redden and lightning walks the peaks. Each phase is announced across the screen.
- **Meteorfall.** In her final phase meteors come down into the clearing: a red ring marks where each will land, just ahead of where you're going. Dodge out of it.
- **Her mega laser.** Every so often from two thirds health she leaps to the far end of the clearing and slams down, throwing just two or three boulders across the snow, so you have to race to one, while pillars of light burst out of the cracks. Then she rises and charges: a summoning circle burns into the snow under her, a barrel of circles opens in front of her, the whole clearing's snow and light streams into her orb, lightning lashes out of it and the sky turns red. Everything goes dark for a breath, then she fires a solid wall of light that fills the clearing. Out in the open you can't see a thing and it burns; behind a boulder it's only blinding. The laser boils the boulders away as it fires, and they're gone by the time it ends.
- **Perfect dodges.** Roll through a bullet, an orb, her dive or the slam ring at the last moment and time slows for a beat, giving you some stamina back.
- **Railguns.** Get hit too often and you're knocked down: she charges two railgun beams, the ground cracking under her and under you, and you have to mash Space to roll clear. It takes more presses every time she knocks you down.
- **Her rages.** At two thirds and one third of her health she goes up on her jets, screams, blasts you back across the snow, and turns the sky redder. The music gets harder each time.
- **If you lose**, she gets her victory laugh, then the death screen lets you respawn at your last save or exit to the main menu (with no save yet, you can fight her again from the top).

At the end she goes up on her jets and rains bullets down while you flip and cartwheel clear, then the two of you lock beams in the air. Hers wins. You wake under the snow, hurt, and have to limp all the way back down the clearing to the balloon on your own. You can't climb in until you've built a fire and sat by it. Build a fire and rest by it, and patch the balloon with 5 wolf pelts and 10 hare pelts. Climb in and fly away.

## Part two: Tokyo

The balloon carries her over the clouds and out across the sea for a long while, until a coastline appears: a city without end. She comes down on a beach at its edge with nothing, not even a single yen.

- **The city**: Sakura Park (a pond with koi, a red arched bridge, stone lanterns and a little shrine) and a green park with a playground, trees down every pavement, zebra crossings and traffic lights, cars on the move, shopfronts with awnings, rooftops crowded with water tanks and aerials, and on the horizon Mt. Fuji, a red-and-white broadcast tower and a bridge across the bay lit up at night. Also: a seaside promenade under cherry trees, a grid of streets under towers lit window by window at night, a station square with a giant screen, a shopping arcade hung with lanterns, live houses, the agency's office, and on the skyline to the north, the Tokyo Dome. People walk the pavements. Anyone with a star over their head has something to say (E to talk).
- **Fame** is how far she's come, from Nobody to Superstar. It grows by helping people (a lost cat, a stuck kite, ramen deliveries, lost bouquets, a honeymoon photo), by busking in the square in the evening (three times a day), and above all on stage.
- **The buildings** are drawn by a shader rather than textures: glass curtain-wall towers that reflect the sky, offices with ribbon windows, apartment blocks with balconies, curtains and air-conditioner units, tiled mid-rises with framed windows. They have cornices, soft shadows at the street and the corners, shopfronts with striped awnings at street level, and at night windows lit one by one (warm lamps, cool lights, the odd television). The streets are textured asphalt and paving, the parks are grass, and the cherry trees are built branch by branch with clusters of blossom and petals on the ground beneath them.
- **Finding your way**: wherever the story wants you next has a column of light over it, and an arrow at the top of the screen shows the way and how far it is. In the city, **M** opens a map of Tokyo with the stages (pink when you can play them), the parks, everyone with something to say (gold stars), the next goal and you. The journal and the balloon parts leave her pack once she's in the city.
- **The stage** is a rhythm game: notes fall down four lanes, charted from the song's own melody, and you hit D F J K as they cross the line. Your accuracy, combo and the crowd's hype decide the fame and pay. Before every busk and gig you choose the song from a setlist (1-9, or Enter for the one you've played least). There are eight songs to unlock as she grows (Snowdrop Heart, Summer Ramune, Paper Plane Promise, Neon Sakura Drive, Pastel Rain, Harajuku Heartbeat, Midnight Train Home, Starlight Runway), plus one for the Dome. Every song has its own sound, chords and melodies:
  - Snowdrop Heart: classic idol pop.
  - Summer Ramune: ska with offbeat guitars, horns and marimba.
  - Paper Plane Promise: a piano ballad.
  - Neon Sakura Drive: synthwave.
  - Pastel Rain: swung city pop on electric piano.
  - Harajuku Heartbeat: chiptune denpa.
  - Midnight Train Home: lo-fi.
  - Starlight Runway: arena rock.
  - Crown of Light: an orchestral epic with choir.
  - Teto's Crimson Drill Parade: trap-metal.

  Each song has Japanese lyrics, sung and shown karaoke-style with the English under them. Every lyric line is fitted to the melody so each syllable gets its own note.

  Miku's voice is synthesized harmonic by harmonic from the formants of each vowel, in a real singing range. Consonants are placed just ahead of the beat: hiss for s and sh, bursts for k, t and p, a hum for m and n, glides for y and w. Notes glide into each other with vibrato, Vocaloid-style. The group sings harmony, and there are choir "aah"s and chopped vocal riffs. The mix keeps the voice on top of the band.

  The note board is flat, with a colour for each lane, and glows pink in fever. Miku faces her audience.
- **Buildings you can go into**: Mrs. Ishida's capsule hotel (the front desk, rows of capsules, capsule eleven to rest in), Starlight Production (reception, President Hoshino's desk, a mirrored practice corner), Miku's apartment (a deep-blue feature wall, LED light round the ceiling, a big window on Tokyo by day or night with curtains and fairy lights, a bed with a plush bunny, a desk with a monitor, mic and gaming chair, a synth and a guitar to play, a Hollywood mirror that comments on her hair, posters of the group, a beanbag and a fluffy rug), and a gas station with a 24-hour konbini.
  - **The konbini** sells snacks and things for the stage: throat lozenges warm the crowd up, an energy drink makes the timing kinder, a pack of penlights brings a bigger busking crowd, and Idol Weekly gives a little fame once a day.
  - **Finding people indoors**: the guide arrow, the map and the phone send you to the right door when the person you need is inside.
- **In the city** Miku has no bow or axe, sprinting costs no stamina, and nobody stands about in the road.
- **Tokyo itself**:
  - **The scramble crossing** in front of the station: the traffic stops, the walk signal chirps, and a crowd of forty crosses from every corner at once.
  - **An elevated commuter railway** runs over the city on a concrete viaduct, with lamps underneath. Silver trains with a green stripe and lit windows rumble across it every minute or so.
  - **The neon**: vertical signs stacked down the sides of the buildings (karaoke, izakaya, ramen, manga cafe...) and lit billboards on the rooftops, all glowing brighter after dark.
  - **The side streets** have utility poles with sagging power lines, and the roads have black and yellow taxis with lit roof signs.
  - **Sakura petals** drift on the air everywhere.
- **The people** have faces (eyes and a mouth), necks, hands, shoes and fringes, and walk with their arms swinging. Girls wear flared skirts and some wear tall boots, with long hair, bobs, twin tails or ponytails, and bows. Office workers wear suit jackets and ties, and plenty of people carry a bag.
- **Her hair**, cut short in the fight with Teto, grows back as you play and as she rises, and it's full again by the rematch.
- **The music in the city** follows the clock: bright pop in the daytime, a late-night piano after dark.
- **The story**: Old Gen the fisherman, Haru the busker, Mrs. Ishida's capsule hotel. A scout from Starlight Production, an audition, and three girls who need a fourth: Aoi, Kotone and Mirai. You name the group. Stages from an 80-person basement to a TV show, a beach festival and a 10,000-seat arena, one show a day. And on every screen, another rookie climbing just as fast: Teto. You meet her backstage, and again on the beach the night before the Idol Summit at the Tokyo Dome.
- **The Tokyo Dome**: the searchlights outside, the countdown, rising up through the stage under the white cable-net roof. Around 12,000 fans fill the field and the tiers of the stands, each one jumping on the beat with a penlight that sways in the verses, pumps in the choruses and rolls round the bowl in a wave. The colours follow the song: teal for her, a rainbow running round the stands, white sparkles in the bridge, gold for the last chorus. Above them a ring of moving lights and a lighting truss, laser fans off the stage, followspots from the back of the bowl, an LED ribbon round the upper deck. A giant LED wall shows the words she's singing, and screens either side show her live from a camera on stage. There are flame cannons on every chorus, a waterfall of sparks and confetti for the finale, and a camera down among the crowd. Then the lights go red and half the Dome turns Teto's colour. That's the end of part two: Miku and Teto face to face, the rematch about to begin.
- **The phone (P in the city)**: Old Gen gives it to her when they first meet, an old one of his grandson's. It has seven apps:
  - **Messages**: everyone she's met texts her as the story moves (a banner pops up when someone does), and you can reply. "Where do I go?" tells you where to go and sets the guide arrow there.
  - **Quests**: every quest she's on and every new lead, with its progress, its reward and a live arrow and distance as you walk, and **Track** to make the guide follow it.
  - **Map**: the city map.
  - **StarTube**: film a song wherever you are (you sing it as a rhythm game, and the better you sing, the more people watch), or post a quick clip, two uploads a day. Views keep coming in over the following days, even while she sleeps, and turn into fame a little at a time, with a bonus at 1,000, 10,000, 100,000 and a million views.
  - **Chirp**: one post a day, for fame and followers.
  - **Schedule**: today's busking, uploads and post, the next goal, and every stage with when its doors open (J opens straight to it).
  - **Settings**: the wallpaper and the size of the interface.
- **Other ways to grow fame** besides quests and shows: StarTube videos, Chirp posts, and fans who stop her in the street (a gold star over them) for an autograph, a selfie or a few lines of a song, up to six a day.
- **Phone wallpapers**: put PNG pictures in the `phone-wallpapers` folder, named `1.png`, `2.png`, `3.png`... and they appear in the phone's Settings. Opened straight from disk, the browser can't look inside a folder, so the game tries those numbers in order until one is missing. Served from a web server, any name works. Settings also has a **Load pictures…** button for any picture, and the one you pick is remembered. The folder has a note in it explaining all this.
- **The interface** scales with the window, so it stays readable on big screens, and can be made bigger or smaller in the phone's Settings. Rest in your capsule (later your apartment) to sleep until morning or until the evening.

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
  showdown.js    Teto's ambush at the balloon and the fight in the clearing
  daynight.js    Day and night, hunger and thirst, sleep
  build.js       Placing campfires, tents and the log cabin, and decorating it
  wolfmodel.js   The wolf, built in code, and its gaits
  city.js        Tokyo: its streets, people and talking
  citydecor.js   Tokyo's parks, street trees, traffic, roads and landmarks
  citynav.js     The guiding beacon and arrow, and the city map
  phone.js       The phone (P): messages, quests, map, StarTube, Chirp, wallpapers; fans; interface scale
  dome.js        Inside the Tokyo Dome: the crowd and their penlights, the lights, lasers and screens
  interiors.js   The buildings she can go into: capsule hotel, agency, apartment, gas station and konbini
  tokyo.js       The scramble crossing, elevated railway, vertical neon, billboards, power lines and petals
  idol.js        Part two's story: fame, quests, the group, Teto
  stage.js       Busking and the stages, the voyage over the sea, the Tokyo Dome
  songs.js       The idol songs, their lyrics and the synthesized voice
  rhythm.js      The rhythm game on stage
  save.js        Saving at campfires, and loading from the title screen
  moderator.js   Moderator menu: flying, no cold, give items, teleports and more
  player.js      Loads the character models, the skin list (SKINS) and the player rig
  boots.js       Black tactical boots, shaped from the characters' own feet
  bow.js         The bow and arrow models, built in code
  world.js       The snow forest: terrain, trees and mountains, built in tiles around the player
  arena.js       The boss arena's terrain, ruins, sky and meteors, and how they react to the fight
  audio.js       All sound effects and music, synthesized in code
  render.js      Lighting, bloom and colour grading
  textures.js    Textures painted in code (snow, bark, fur)
  glb.js         Reads the embedded model files
  style.css      Menus and HUD styling (each module above also has its own .css where it needs one)
```

Each file in `models/` is a `.glb` 3D model stored as text, because browsers won't load separate model files from a page opened straight from disk. They can't be edited directly. To change a model, edit the original `.glb` in Blender or a similar tool, then convert it again.

## Credits

Character models: ["Doomer Miku and Teto"](https://sketchfab.com/3d-models/doomer-miku-and-teto-5d99f01932df476dbddfe8e34ace6bbe) by [0x00001337](https://sketchfab.com/0x00001337), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Rescaled, with the cigarette props removed and generated hair bones added for animation. The file is `models/characters/doomer-miku-and-teto.js`.

Wolf: built in code for this game (`src/wolfmodel.js`), with its own hand-made gaits.

Plane: ["RAF Voyager Aeroplane (Private Plane)"](https://sketchfab.com/3d-models/raf-voyager-aeroplane-private-plane-750e92f1cf7e4fb5b8e78c91a0253648) by [Foggy_123](https://sketchfab.com/foggy_123), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Only its colour textures are kept, scaled down. The file is `models/vehicles/plane.js`.

Scythe: ["Double Scythe"](https://sketchfab.com/3d-models/double-scythe-c6db4ad9ef0042d8935e9e54dc37b21d) by [EVAI](https://sketchfab.com/Evvvai), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Only its geometry is kept; the game colours it blue. The file is `models/weapons/double-scythe.js`.
