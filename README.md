# Elevators

A love story in eight chapters. It's midnight, and you step into a glass elevator on the outside of the tallest tower in the city. Someone is already in it, watching the lights: Miku. You ride down together. Then you keep riding down together, night after night, until the elevator closes for good.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. The start button reads "Loading…" for a few seconds while Miku's model loads. A full playthrough takes about 40 minutes.

| Input | Action |
| --- | --- |
| Mouse | Look around (chapter 1) |
| WASD | Walk (chapter 1) |
| E / Space / Enter / click | Talk to Miku; move the text on |
| 1 – 7, or click | Pick what to say |
| M | Mute |
| Esc | Pause (chapter 1) |

## The story

1. **Floor 70**: you start on the dim floor-70 landing and walk into the elevator yourself. She's at the glass. You meet, and she talks at each stop on the way down: her windowless apartment, the song she can't finish. Played in first person.
2. **Same Time Tomorrow**: two cans of coffee from the vending machine, and she sings you the first verse.
3. **The Blue Room**: after her show in a basement bar, ramen at a stall at the foot of the tower. An egg is stolen.
4. **Up on the Roof**: fairy lights on her building's roof, the second verse, and maybe a kiss.
5. **Last Month**: a notice on the landing. The glass elevator is being taken off the building.
6. **A Window**: your apartment on the 40th floor across the road, with a window that looks straight at the elevator, and a question.
7. **Home**: a week living together. Each evening you choose one of seven things to do: cook, movie night, write the song's last line at the keyboard, a ramen date, a walk in the park, laundry day, or watch the rain.
8. **Seventy Floors**: the very last ride, at dawn. She sings the whole song.

Your choices change what she says and remembers, so the egg, the heights, the star names and the line you write for her song all come back later. How warm you are along the way decides whether she moves in. There are two endings, **Home** and **A Window of Her Own**. Progress saves at the start of each chapter (Continue on the title screen), and once you've reached an ending you can replay any chapter from the title screen.

## What's in it

- **The places**: the tower's floor-70 landing; the glass car riding the outside of the tower, with four dark concrete bands it passes through; a ramen stall on the plaza at the tower's foot; a park bench with fireflies; the roof of Miku's old building; your apartment. Her building and your tower are real buildings in the city, visible from the elevator.
- **Miku**: the Sanrio x Project Sekai Miku, a rigged model, standing with her hands clasped behind her back. She turns to face you when she talks, and to the view when she sings.
- **The music**, all synthesised: a sad piano-and-strings theme for the elevator; a warm, tender theme for your time together; and her song, "Seventy Floors", with a soft synthesised voice singing the tune. The music goes muffled in the concrete bands.
- **The city**: low-poly and flat-shaded, with about 2,500 lit towers, traffic, parks, a moon and mountains.

## Files

- `src/story.js`: the whole story: every chapter, all the dialogue, the endings, chapter cards and saving.
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
