# Elevators

A first-person ride down a glass elevator at night. You step into a twelve-sided glass car on the outside of the tallest tower in the city. Miku is already there, standing at the glass and looking out over the skyline. The car starts at floor 70 and slowly descends, taking about three minutes to reach the ground. Walk up to her and press E to talk. For now the game is the start screen and the ride down.

Open `index.html` in a desktop browser to play. An internet connection is needed because Three.js loads from a CDN. The start button reads "Loading…" for a few seconds while Miku's model loads.

| Input | Action |
| --- | --- |
| Mouse | Look around |
| WASD | Walk around the car |
| E | Talk to Miku (when you're near her and looking at her), then move the conversation on |
| 1 – 5 | Pick what to say |
| M | Mute |
| Esc | Pause (click to carry on) |

## What's in it

- **The landing**: you start inside the tower on floor 70, in a small, dim lobby with a bench, a dead plant and one ceiling light that keeps flickering. The elevator's doors stand open at the far end with Miku inside. Walk in; the doors close behind you and the car sets off.
- **The ride**: the car rides the outside of the tower, open to the city. It leaves floor 70, hangs still for 20 seconds at floors 49, 28 and 10 so you can look out, and ends on the ground.
- **The building bands**: four times on the way down, the car slides through a band of raw concrete wrapped round the tower, shut in for about 7 seconds. Inside it's dark and water-stained, the lamps are weak, dim or dead and flicker, the car's light sinks to amber, and the music goes muffled as if through the walls.
- **Start screen**: the camera drifts in the landing, looking through the open doors at Miku in the car.
- **Miku**: the Sanrio x Project Sekai Miku, in her blue pinafore dress with the apple bag. She's a rigged model; she stands with her hands clasped behind her back, posed by solving each arm's bones to reach the small of her back. When you talk to her she turns to face you, then turns back to the view when you're done. What she says first depends on how far down the car is. You can ask her what she's looking at, whether she rides this a lot, who she is and what she thinks of the city. Walking away ends the conversation.
- **The car**: nine glass panes face the city, with a handrail round them at waist height on brackets. The three steel panels at the back hold the doors, a floor readout and a call button. There's a ring light in the ceiling and a teal light ring round the floor's edge. The car hangs on two cables and sways slightly as it moves.
- **The city**: low-poly and flat-shaded. About 2,500 towers with lit windows, three downtown clusters, setbacks and crowns, red aviation lights on the tallest roofs, parks, streetlights and 1,400 cars of moving headlights and tail lights. There's a faceted sky that glows purple at the horizon, stars, a low moon and mountains around the edge.
- **Sound**: all synthesised. The music is a slow, sad piece in A minor for soft piano and low strings in a long reverb, about 74 seconds looping, that keeps ending on an unresolved chord. Under it are a motor hum, wind and the city, which go muffled inside the concrete bands, and a two-note chime at each stop.

## Files

- `src/main.js`: game flow, the start screen, first-person controls, the descent, and where Miku stands.
- `src/talk.js`: the conversation with Miku, including everything she says.
- `src/miku.js`: loads Miku with three.js's GLTF loader, hides the rig's physics-collider meshes, scales her to height and poses her arms.
- `src/elevator.js`: the glass car.
- `src/building.js`: the floor-70 landing, the concrete bands the car passes through, and where it stops.
- `src/city.js`: the city, sky and the tower.
- `src/audio.js`: the sound.
- `models/miku.js`: the model (a .glb, about 3 MB), embedded as a script by `tools/embedglb.ps1`.

Three.js and its GLTF loader are loaded as modules (see the import map in `index.html`), which then load the game's scripts in order.

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
