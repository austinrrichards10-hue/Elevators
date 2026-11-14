# Elevators

A love story in eight chapters. It's midnight, and you step into a glass elevator on the outside of the tallest tower in the city. Someone is already in it, watching the lights: Miku. You ride down together. Then you keep riding down together, night after night, until the elevator closes for good.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. The start button reads "Loading…" for a few seconds while Miku's model loads. A full playthrough takes about 40 minutes.

| Input | Action |
| --- | --- |
| Mouse | Look around |
| WASD (Shift to hurry) | Walk |
| E | Talk to Miku; use the thing you're looking at |
| Q or Tab | Your phone |
| E / Space / Enter / click | Move the text on |
| Hold Ctrl | Fast-forward through dialogue |
| 1 – 9, or click | Pick what to say |
| M | Mute |
| Esc | Pause; close the phone or computer |

## Life at home

Between the story's nights you're at home, in your apartment on the 40th floor across the road from the tower, walking about in first person.

- **The computer** (on the desk): **Lumen Mart** sells things for your place (a teal neon sign, fairy lights for the window, a leek plushie, a star projector that puts a sky on your ceiling, a fish tank, a floor cushion, a Gerald poster) and gifts for Miku (a green onion bouquet, an apple bag charm, a city pop record, a star map, a lemon-yellow scarf, two coffees, a cat plush). Everything arrives the next day: decorations appear in the apartment, gifts go in your bag, or once you have her number you can send them straight to her. **NightShift** is your job: type the words as they come up, $3 a word, one shift a day.
- **Your phone** (Q): **Messages**, once you have her number. She texts you on some days, you reply, and you can say goodnight. **Photos**, an album of memories taken at the end of each chapter and each evening together. **Status**: hearts, day, wallet, your bag and what's arriving.
- **Gifts**: each one gets its own reaction, and she remembers which ones you've given her. Give them in person when she's home, or have them sent to her and she'll text you about it.
- **The front door**: go out for ramen ($8) or a walk in the park. Once you have her number, you might bump into her at the stall.
- **The bed** (through the back door): sleeping ends the day and the story moves on.
- **The week together**: once she's moved in, she's in the apartment with you. Walk over and talk to her to plan the evening, give her a gift or just chat; then go to bed.

Hearts (shown top left) come from affection: kind answers, texts, goodnights and gifts. Miku doesn't speak aloud: the words are on screen, and the only sound she makes is a short, light giggle when she laughs.

## The story

1. **Floor 70**: you start on the dim floor-70 landing and walk into the elevator yourself. She's at the glass. You meet, and she talks at each stop on the way down (about a minute and a half): her windowless apartment, the song she can't finish. Then you go home.
2. **Same Time Tomorrow**: two cans of coffee from the vending machine, and she sings you the first verse.
3. **The Blue Room**: after her show in a basement bar, ramen at a stall at the foot of the tower. An egg is stolen.
4. **Up on the Roof**: fairy lights on her building's roof, the second verse, and maybe a kiss.
5. **Last Month**: a notice on the landing. The glass elevator is being taken off the building.
6. **A Window**: your apartment on the 40th floor across the road, with a window that looks straight at the elevator, and a question.
7. **Home**: a week living together. Each evening you choose one of seven things to do: cook, movie night, write the song's last line at the keyboard, a ramen date, a walk in the park, laundry day, or watch the rain.
8. **Seventy Floors**: the very last ride, at dawn. She sings the whole song.

Your choices change what she says and remembers, so the egg, the heights, the star names and the line you write for her song all come back later. How warm you are along the way decides whether she moves in. There are two endings, **Home** and **A Window of Her Own**. Progress saves at the start of each chapter (Continue on the title screen), and once you've reached an ending you can replay any chapter from the title screen.

## What's in it

- **The look**: everything is rendered with bloom (lights, neon, the city and screens glow), a soft vignette and fine film grain. Both can be turned off in Settings.
- **Title screen**: a slow cinematic drift round the outside of the glass car at floor 70, letterboxed, with an animated logo, drifting specks of light and a loading bar.
- **Settings** (title screen and pause menu): music and sound volume, mouse sensitivity, text speed, glow, film grain and fullscreen, saved between sessions. **Esc** pauses, with Resume, Settings and Quit to title.
- **Your apartment**:
  - **Surfaces**: an oak plank floor, a deep teal back wall with panelling and skirting, warm LED cove lighting and recessed downlights, and floor-to-ceiling glass with sheer curtains.
  - **Kitchen**: dark teal cabinets with brass handles, subway tiles, a sink, hob, range hood, kettle, fruit bowl, herbs and a coffee machine.
  - **Living area**: a sofa with pillows and a throw, a walnut coffee table with mugs and a candle, a side lamp, a patterned rug, and a dining nook under a globe pendant.
  - **Desk**: a glowing screen, lamp, headphones and chair.
  - **Walls and corners**: a gallery wall, a styled bookshelf with records, an arc floor lamp, plants (including a hanging one), and a yellow scarf on the hooks by the door.

- **The places**: the tower's floor-70 landing; the glass car riding the outside of the tower, with four dark concrete bands it passes through; a ramen stall on the plaza at the tower's foot; a park bench with fireflies; the roof of Miku's old building; your apartment. Her building and your tower are real buildings in the city, visible from the elevator.
- **Miku**: the Sanrio x Project Sekai Miku, a rigged model, animated live. She breathes and shifts her weight, and glances around (and at you, when you're close). When she turns, her head goes first and her body follows on a spring, easing in and settling. Her arms move through gestures that suit what she's saying: hands behind her back at ease, explaining, asking with open hands, a hand to her mouth when she laughs, a wave, hands to her chest when she's shy, reaching out toward the city when she sings. Each arm is solved as a two-bone chain every frame, and the hands go round her sides when moving between front and back.
- **The music**, all synthesised: a sad piano-and-strings theme for the elevator; a warm, tender theme for your time together; and her song, "Seventy Floors", played on piano while the lyrics come up. The music goes muffled in the concrete bands.
- **The city**: low-poly and flat-shaded, with about 2,500 lit towers, traffic, parks, a moon and mountains.

## Files

- `src/story.js`: the whole story: every chapter, all the dialogue, the endings, chapter cards and saving.
- `src/settings.js`: the settings and their screen.
- `src/life.js`: life at home: money and days, the shop and deliveries, gifts, the phone (messages, photos, status) and the computer (shop, work, orders).
- `src/talk.js`: the dialogue box, and the little script runner the story is written in (lines, narration, sung lines, choices, affection, flags).
- `src/main.js`: the world and the camera: the ride, first-person walking, cinematic shots, and the `Game` API the story uses.
- `src/places.js`: the ramen stall, the park, the rooftop and the apartment.
- `src/building.js`: the floor-70 landing, the concrete bands, and where the car stops.
- `src/miku.js`: loads Miku with three.js's GLTF loader, hides the rig's physics-collider meshes, and poses her arms.
- `src/elevator.js`: the glass car. `src/city.js`: the city, sky and tower. `src/audio.js`: sound and music.
- `models/miku.js`: the model (a .glb, about 3 MB), embedded as a script by `tools/embedglb.ps1`.

### Swapping the model

A browser won't let a page opened from disk load a `.glb` file directly, so the model is embedded in a script:

```
powershell -ExecutionPolicy Bypass -File tools\embedglb.ps1 "path\to\model.glb" models\miku.js MIKU_GLB
```

The arm posing in `src/miku.js` finds the elbows by their `Left_EllbowSupport` / `Right_EllbowSupport` helper bones, so a different rig may need that adjusting.

### Previewing and auto-saving

- `tools/serve.ps1` is a tiny local web server for previewing the game: `powershell -ExecutionPolicy Bypass -File tools\serve.ps1`, then open http://localhost:8124/.
- `tools/autopush.ps1` commits and pushes everything to GitHub. A Claude Code hook in `.claude/settings.json` runs it at the end of every turn.

## Credits

"Miku (Sanrio X Project Sekai)" by 雨宮レン ([Sketchfab](https://sketchfab.com/3d-models/miku-sanrio-x-project-sekai-a674a00fbe8d4b688bd375d57fe17868)), CC BY 4.0.
