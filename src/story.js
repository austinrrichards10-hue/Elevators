// ELEVATORS: a love story in eight chapters.
//
//   1  Floor 70             You meet her in the glass elevator. (Played in first person.)
//   2  Same Time Tomorrow   Two coffees. The song she can't finish.
//   3  The Blue Room        Her show, then ramen. A stolen egg.
//   4  Up on the Roof       Fairy lights, the second verse, and maybe a kiss.
//   5  Last Month           The elevator is closing for good.
//   6  A Window             Your apartment, and a question.
//   7  Home                 A week living together: pick what you do each evening.
//   8  Seventy Floors       The last ride, at dawn.
//
// How warm you are along the way (affection) decides how chapter 6 goes, and so which of the
// two endings you reach. Progress saves at the start of every chapter.
const Story = (() => {
  const state = { aff: 0, flags: {}, name: '', evenings: [] };
  const KEY = 'elevators-story-v1';
  const TOGETHER = 18;      // affection she needs, by chapter 6, to say yes

  // ---------- Saving ----------
  let save = { current: 0, snaps: {}, endings: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.snaps) save = s; } catch (e) { /* no storage */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* no storage */ } };
  const snapshot = () => JSON.parse(JSON.stringify(state));
  const restore = (s) => {
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, JSON.parse(JSON.stringify(s)));
    state.flags = state.flags || {};
    state.evenings = state.evenings || [];
  };

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const say = (script) => new Promise((r) => Talk.run(script, r));
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const until = (fn) => new Promise((r) => { const c = () => (fn() ? r() : setTimeout(c, 100)); c(); });
  async function fadeOut() { $('fade').classList.remove('clear'); await wait(1.0); }
  async function fadeIn() { $('fade').classList.add('clear'); await wait(0.4); }
  async function card(kicker, title, sub, secs = 2.6) {
    $('card-kicker').textContent = kicker;
    $('card-title').textContent = title;
    $('card-sub').textContent = sub || '';
    $('card').classList.add('show');
    await wait(secs);
    $('card').classList.remove('show');
    await wait(0.75);
  }
  const W = (s) => ({ space: 'world', pos: s.pos, look: s.look });
  const place = (name, shotName) => W(Game.places[name].shots[shotName]);
  const cut = (name, shotName) => ({ do: () => Game.shot(place(name, shotName), true) });
  const pan = (name, shotName) => ({ do: () => Game.shot(place(name, shotName)) });
  const CAB = {
    two: { space: 'cab', pos: [-0.75, 1.62, -0.45], look: [0.35, 1.2, 1.12] },
    close: { space: 'cab', pos: [-0.12, 1.52, 0.05], look: [0.3, 1.4, 1.12] },
    view: { space: 'cab', pos: [-0.45, 1.75, -0.95], look: [0.6, -2, 16] },
    side: { space: 'cab', pos: [1.05, 1.5, 0.35], look: [0.3, 1.3, 1.12] },
  };
  const cab = (n) => ({ do: () => Game.shot(CAB[n]) });
  const face = (f) => ({ do: () => Game.mikuFace(f) });
  const music = (m) => ({ do: () => Sound.music(m) });
  const dawn = (k) => ({ do: () => Game.dawn(k) });

  // ======================================================================================
  // Chapter 1: Floor 70. Played in first person; she talks at each stop on the way down.
  // ======================================================================================
  const MEET = [
    "n: She's standing at the glass with her hands folded behind her back, watching the city like it might do something.",
    "m: …Oh! Sorry. I didn't hear the doors.",
    "m: Nobody takes this one at midnight. I sort of think of it as mine. Which is ridiculous. It's a public elevator.",
    { c: [
      { t: 'I can wait for the next one.', then: ["m: There isn't a next one. It's just this car, all night, up and down.", "m: Stay. I don't actually mind."] },
      { t: "It's a big elevator. I think we can share.", a: 1, then: ["m: Generous of you. Okay. Shared custody."] },
      { t: 'If it\'s yours, you should charge rent.', a: 1, then: ["m: I'd make a fortune. One coin a floor.", "m: You already owe me seventy."] },
    ] },
    "m: I'm Miku.",
    "m: And you are…?",
    { name: true },
    "m: {name}. Okay.",
    "m: Hi, {name}.",
    "m: You picked a good night. No clouds. You can see all the way out to the mountains.",
    "n: She turns back to the glass. The city goes on below you, every window a small lit room.",
  ];

  const IDLE = [
    ["m: Don't mind me. I'm counting windows. I always lose count somewhere around four hundred."],
    ["m: If you put your hand flat on the glass, you can feel the wind. It hums."],
    ["m: See the red lights on the rooftops? They blink so the planes don't hit them.", "m: I think they look lonely. Blinking at nobody all night."],
    ["m: Sorry. I'm bad at small talk.", "m: Medium talk, I'm okay at. Big talk, I'm great at. It's a problem at parties."],
    ["m: The lights in that office tower go out in a wave at one o'clock. Every night. Like the building's yawning."],
    ["m: When I was little, I thought elevators were tiny rooms that stayed still while the building moved around them.", "m: …I still sort of think that, up here."],
  ];

  const STOP_BEATS = {
    1: [
      "m: This is where it stops for a bit. Nobody knows why.",
      "m: I asked the building manager once and he just said, “For the view.”",
      "m: I think that's the most romantic thing a building manager has ever said.",
      { c: [
        { t: 'Do you ride this every night?', a: 1, then: ["m: Every night after rehearsal. Up the fast elevator inside, down this one.", "m: It's four minutes where I don't have to be anyone."] },
        { t: 'So what do you do, Miku?', a: 1, then: ["m: I sing. In basements, mostly. Places with eleven chairs and a sticky floor.", "m: It's not as sad as it sounds.", "m: Okay, it's a little sad. But when it goes right, it feels like this. Like being up high."] },
        { t: 'It is a good view.', then: ["m: Right? Someone gets it."] },
      ] },
      "m: What about you? Who rides a glass elevator at midnight on purpose?",
      { c: [
        { t: "I just moved here. I don't know anyone yet.", a: 1, set: 'newHere', then: ["m: Oh. Then— welcome. To the city. On behalf of the city.", "m: Which has not authorized me to say that.", "m: It's lonely at first. It gets better. Mostly because you find places like this."] },
        { t: 'I work late. This is my way to the train.', a: 1, set: 'worksLate', then: ["m: Then we're going to see a lot of each other.", "n: She says it like a fact, and doesn't look away."] },
        { t: 'Honestly? I got lost looking for the fast elevator.', a: 1, set: 'lost', then: ["n: She laughs, properly, a surprised sound that fogs a little circle on the glass.", "m: That's the best reason anyone's ever had.", "m: Stay lost a bit."] },
      ] },
    ],
    2: [
      "n: Somewhere far below, a siren winds through the streets and fades.",
      "m: Can I tell you something weird?",
      { c: [
        { t: 'Weird is good.', a: 1 },
        { t: 'How weird are we talking?' },
      ] },
      "m: My apartment doesn't have a window.",
      "m: It's a studio in an old building over by the river. Very cheap. Very tiny.",
      "m: The landlord calls it “a light well.” It's a wall. It's a wall that someone painted white.",
      "m: So… this is my window. Seventy floors of it. That's why I ride it.",
      { c: [
        { t: "That's the saddest thing I've ever heard.", then: ["m: It's okay. It's a really good window."] },
        { t: "Then it's a pretty great window.", a: 1, then: ["m: It's the best one in the city. I checked."] },
        { t: 'You could borrow mine sometime.', a: 1, set: 'offered', then: ["n: She looks at you a beat too long.", "m: …Careful. I'll take you up on that."] },
      ] },
    ],
    3: [
      "m: Here's where it gets loud again. The city comes up to meet you.",
      "m: I'm writing a song about this ride. It's called “Seventy Floors.”",
      "m: I've got everything except the ending. Every time I try to write the last verse, the elevator reaches the ground.",
      { c: [
        { t: 'Sing me some of it?', a: 1, then: ["m: No! …Maybe. Not tonight.", "m: I don't sing for people I've known for eleven minutes.", "m: Twelve. Ask me at twelve."] },
        { t: 'Maybe it needs a longer elevator.', a: 1, then: ["m: I'll write to the city council."] },
        { t: "Maybe it doesn't have an ending yet.", a: 1, set: 'wise', then: ["m: …Huh.", "m: Yeah. Maybe it doesn't."] },
      ] },
    ],
  };

  const GROUND = [
    { do: () => { Game.state.doorTarget = 1; } },
    "n: The car settles at the bottom. Street noise leaks in round the doors: tires on wet road, a bus sighing at the curb.",
    "m: Ground floor. Back to the noise.",
    "m: …This was nice. I don't usually talk on the way down.",
    "m: Do you—",
    "m: Will you be taking this elevator again? Tomorrow, maybe? Around midnight?",
    { c: [
      { t: 'Same time tomorrow.', a: 2, then: ["n: She grins, and tries to stop grinning, and can't.", "m: Same time tomorrow."] },
      { t: "I'll be here.", a: 1, then: ["m: Okay. Good. Then I'll— okay."] },
      { t: 'Only if I get lost again.', a: 1, if: (S) => S.flags.lost, then: ["m: Then I hope you get very, very lost."] },
      { t: "We'll see.", a: -1, then: ["m: Right. Of course. No pressure.", "n: She's already looking at the doors."] },
    ] },
    "m: Goodnight, {name}.",
    "n: She steps out into the street and turns up her collar, and the city takes her.",
  ];

  function chapterRide() {
    return new Promise((resolve) => {
      const pending = [];
      let busy = false, met = false, idle = 0;
      const drain = async () => {
        if (busy) return;
        busy = true; Game.hold(true);
        while (pending.length) {
          Game.mikuFace('player');
          await say(pending.shift());
        }
        Game.mikuFace('view');
        busy = false; Game.hold(false);
      };
      const meetFirst = () => { if (!met) { met = true; pending.push(MEET); } };
      Game.hooks.board = () => Game.hint("She's at the glass. Walk up to her and press E.", 9);
      Game.hooks.canTalk = () => !busy;
      Game.hooks.talk = () => {
        if (!met) meetFirst(); else pending.push(IDLE[idle++ % IDLE.length]);
        drain();
      };
      Game.hooks.stop = (i) => { meetFirst(); if (STOP_BEATS[i]) pending.push(STOP_BEATS[i]); drain(); };
      Game.hooks.arrive = async () => {
        meetFirst(); pending.push(GROUND);
        await until(() => !busy);
        drain();
        await wait(0.2);
        await until(() => !busy);
        for (const k in Game.hooks) Game.hooks[k] = null;
        resolve();
      };
    });
  }

  async function ch1() {
    Sound.music('sad');
    Game.titleMode();
    Game.newRide({ playable: true, stops: true, speed: 1 });
    Game.firstPerson(() => Game.hint('Mouse to look · WASD to walk · Step into the elevator', 10), true);
    await fadeIn();
    await chapterRide();
    await wait(1.5);
    return 1;
  }

  // ======================================================================================
  // Chapter 2: Same Time Tomorrow.
  // ======================================================================================
  async function rideScene(speed = 0.5) {
    Game.newRide({ playable: false, stops: false, speed });
    Game.shot(CAB.two, true);
    Game.mikuFace('cam');
    await fadeIn();
  }
  async function landRide() {
    Game.hurry();
    await until(() => Game.arrived);
    await wait(1);
  }

  async function ch2() {
    Sound.music('sad');
    await rideScene(0.45);
    await say([
      "n: The next night, you take the fast elevator up to seventy. The doors of the glass car are already open.",
      "n: She's inside. She's holding two cans of coffee from the vending machine on the landing.",
      "m: You came.",
      "m: I didn't know which kind you like, so I got one sweet and one black. I'm going to pretend I like whichever one you don't pick.",
      { c: [
        { t: 'Black, please.', a: 1, then: ["m: Oh, thank god.", "n: She cracks the sweet one open with enormous relief.", "m: I lied. I can't drink black coffee. It tastes like a parking garage."] },
        { t: 'The sweet one.', a: 1, then: ["m: …Great. Great.", "n: She opens the black one and takes a sip with tremendous dignity.", "m: It's fine. It tastes like a parking garage. I love it."] },
        { t: 'You pick. You bought them.', a: 1, then: ["m: Okay, but now I'm nervous you're a black-coffee person and I'm about to disappoint you.", "n: She gives you the sweet one.", "m: There. Now we're both happy, or we're both lying."] },
      ] },
      "n: The car slides out over the city. There's a thin haze tonight, and every light has a soft halo round it.",
      cab('close'),
      "m: I thought about what you said. About the song.",
      { if: (S) => S.flags.wise,
        then: ["m: That maybe it doesn't have an ending yet. It's been stuck in my head all day. Like a splinter.", "m: A good splinter."],
        else: ["m: I tried to write the last verse all day. I wrote eleven versions on napkins.", "m: They all rhyme “city” with “pretty.” It's a crisis."] },
      "m: …It's been twelve minutes since I met you. Technically. If you count last night.",
      "m: You asked if I'd sing you some of it.",
      { c: [
        { t: "I'd love to hear it.", a: 1 },
        { t: 'Only if you want to.', a: 2 },
      ] },
      face('view'), cab('two'), music('song'),
      "n: She turns to the glass so she doesn't have to look at you. Her singing voice is quieter than her talking voice, and steadier.",
      "s: Seventy floors of the city at night / every window somebody holding on tight",
      "s: I count them going down, I lose my place / I start again from the top, I keep the pace",
      "s: And all the way down, all the way down / I'm the only one awake in this town",
      "n: She stops. The last note hangs in the glass for a second after she does.",
      music('sad'), face('cam'), cab('close'),
      "m: That's as far as it goes. Then there's a hole where the ending should be.",
      { c: [
        { t: "It's beautiful.", a: 1, then: ["n: She ducks her head.", "m: Stop.", "m: …No, keep going, actually. I don't get told that a lot."] },
        { t: "You're not the only one awake.", a: 2, set: 'awake', then: ["n: She looks at you. Really looks.", "m: …No. I guess I'm not."] },
        { t: 'It sounds lonely.', a: 1, then: ["m: It is lonely. That's the problem.", "m: I don't know how to end a lonely song without lying."] },
      ] },
      "m: Your turn. Tell me something real. One thing.",
      { c: [
        { t: 'I talk to my plants. They\'re doing great.', a: 1, then: ["m: That is SO real. What do you say to them?", "y: Mostly that they're doing great.", "m: Positive reinforcement. Smart."] },
        { t: "I haven't talked to anyone like this in a long time.", a: 2, then: ["m: …Me neither.", "m: Isn't that strange? A whole city full of people, and you have to find them in an elevator."] },
        { t: "I'm scared of heights.", a: 1, set: 'heights', then: ["m: WHAT.", "m: You're in a GLASS ELEVATOR. On the OUTSIDE of a BUILDING.", "y: I know.", "m: …And you came back anyway.", "n: She steps a little closer, like that might help. It does."] },
      ] },
      cab('two'),
      "n: The ground comes up to meet you, slowly, the way it does.",
      "m: Friday I have a show. It's at a place called the Blue Room, under the laundromat on Fourth.",
      "m: It's very small and it smells like fabric softener.",
      "m: Will you come? You don't have to. It's okay if you don't. But will you?",
      { c: [
        { t: "I'll be in the front row.", a: 2, then: ["m: The front row's easy. There's only two rows."] },
        { t: "Under a laundromat? I wouldn't miss it.", a: 1, then: ["m: It's very glamorous. Bring a sock. Everyone loses a sock."] },
        { t: "I'll try.", then: ["m: Okay. Trying is good. Trying's allowed."] },
      ] },
      "m: I'm on second. After a man who plays the saw.",
      "m: Don't be late. He's very moving. People cry.",
    ]);
    await landRide();
    return 2;
  }

  // ======================================================================================
  // Chapter 3: The Blue Room. After her show: ramen.
  // ======================================================================================
  async function ch3() {
    Sound.music('warm');
    Game.goTo('stall');
    Game.shot(place('stall', 'wide'), true);
    Game.mikuFace('cam');
    await say([
      "n: The Blue Room is exactly as small as she said. Eleven chairs. An old man plays the saw, beautifully, and nobody claps because they're not sure if they're allowed.",
      "n: Then Miku walks on with a keyboard under her arm and a pencil in her hair she's forgotten about.",
      "n: She sings the first three songs with her eyes shut. On the fourth, she opens them, finds you, and doesn't shut them again.",
      "n: Afterwards you walk out into the night together. The air smells like rain that hasn't happened yet.",
    ]);
    await fadeIn();
    await say([
      "m: I'm starving. Singing makes me starving. Is that normal? I think that's normal.",
      "m: Oh! A ramen stall. There's always a ramen stall. It's the law.",
      cut('stall', 'close'),
      "m: So. Be honest. Was it okay?",
      { c: [
        { t: 'You were incredible.', a: 1, then: ["m: You're just saying that because you're kind.", "m: …Say it again, though."] },
        { t: 'You looked at me during the fourth song.', a: 2, set: 'fourth', then: ["n: She goes very pink.", "m: I did not.", "m: …I lost my place in the lyrics. It was your fault."] },
        { t: 'The saw guy was incredible.', then: ["m: HE IS. Isn't he? That's Gerald. He's eighty-one.", "m: I want to be Gerald when I grow up."] },
      ] },
      "n: The old man behind the counter sets down two bowls without being asked. He seems to know her.",
      "m: Extra green onions for me, please. Extra extra.",
      { c: [
        { t: "That's a lot of green onions.", a: 1, then: ["m: It's a color thing. And a flavor thing.", "m: It's mostly a color thing."] },
        { t: 'Same for me.', a: 1, then: ["n: She gives you a slow, approving nod.", "m: A person of taste."] },
      ] },
      "n: You look away for one second, at a bus going past. When you look back, your egg is gone.",
      "n: Miku is chewing. Innocently.",
      { c: [
        { t: 'Did you just steal my egg?', a: 1, then: ["m: I don't know what you're talking about.", "m: …It looked lonely."] },
        { t: 'Steal hers back.', a: 1, set: 'eggWar', then: ["n: You steal hers. She gasps like you've committed a crime against nations.", "m: This is war.", "n: She's grinning so hard she can't eat."] },
      ] },
      pan('stall', 'tower'),
      "n: Above you the tower goes up and up into the dark, and the glass car is a small lit bead sliding down its side.",
      "m: Look. Someone's in our elevator.",
      "m: …“Our.” Sorry. That's presumptuous.",
      { c: [
        { t: "It's our elevator.", a: 2 },
        { t: 'Shared custody, remember?', a: 2, then: ["m: Shared custody. I remember."] },
        { t: "It's fine.", then: ["m: Right. Yes. Fine."] },
      ] },
      cut('stall', 'close'),
      "n: She walks you to the corner. At the corner, she stops.",
      "m: Can I have your number? So I can— I don't know. Send you pictures of the moon. Normal stuff.",
      "n: You swap phones. She puts herself in as “Miku (elevator).”",
      { do: (S) => { S.flags.number = true; } },
      "m: Text me when you get home safe. That's a thing people do, right? I've seen it in movies.",
      { c: [
        { t: "I'll text you.", a: 1 },
        { t: "I'll text you the moon.", a: 2, then: ["m: The whole thing?", "y: The whole thing.", "m: …Okay. I'll be up."] },
      ] },
      "n: That night you send her a blurry picture of the moon from your living room.",
      "n: She sends back eleven moon emojis. Then:",
      "m: wait",
      "m: you have a WINDOW??",
      { do: (S) => { S.thread = S.thread || []; S.thread.push({ from: 'y', text: '📷 [a blurry moon]' }, { from: 'm', text: '🌙🌙🌙🌙🌙🌙🌙🌙🌙🌙🌙' }, { from: 'm', text: 'wait' }, { from: 'm', text: 'you have a WINDOW??' }); } },
    ]);
    return 3;
  }

  // ======================================================================================
  // Chapter 4: Up on the Roof.
  // ======================================================================================
  async function ch4() {
    Sound.music('warm');
    Game.goTo('roof');
    Game.shot(place('roof', 'wide'), true);
    Game.mikuFace('cam');
    await say([
      "n: Three weeks of midnights. Coffee in the glass car. Ramen after shows. Texts at three in the morning about nothing at all.",
      "n: Then one night she writes: “Don't take the elevator tonight. Come to mine. Bring a coat.”",
    ]);
    await fadeIn();
    await say([
      "m: Welcome to my roof. Technically the landlord's roof. Technically we're trespassing.",
      "m: The door at the top of the stairs has a broken lock, and I'm the only one who knows.",
      "m: I put the lights up myself. It took four nights and I fell over twice.",
      { c: [
        { t: "It's perfect.", a: 1, then: ["m: It's a roof with a rug on it.", "m: …But yeah. It's perfect."] },
        { t: 'You fell over twice?', a: 1, then: ["m: Once was on purpose. To see if anyone would notice.", "m: No one did. Which is sort of the point of a roof."] },
      ] },
      pan('roof', 'view'), face('view'),
      "n: From up here the tower fills half the sky. You can see the glass car, very small, starting its long way down.",
      "m: You can see our elevator from here. When I can't sleep, I come up and watch it go up and down.",
      "m: It's like a heartbeat. The building's heartbeat.",
      cut('roof', 'close'), face('cam'),
      "m: {name}. I wrote more of the song.",
      "m: Not the ending. But more. Do you want to hear it?",
      { c: [
        { t: 'Always.', a: 2 },
        { t: 'Yes.', a: 1 },
      ] },
      music('song'), face('view'), pan('roof', 'stars'),
      "s: You got lost on your way to somewhere else / and found me counting windows by myself",
      { if: (S) => S.flags.heights,
        then: ["s: You're scared of heights and you rode down anyway / you held the rail and still found something to say"],
        else: ["s: You said the song could stay unfinished for a while / I didn't say a thing, I only smiled"] },
      "s: And all the way down, all the way down / I wasn't the only one awake in this town",
      cut('roof', 'close'), face('cam'), music('warm'),
      "n: She turns round before the last note has finished fading.",
      "m: It's about you. Obviously. I'm not subtle. I have never once been subtle in my life.",
      { c: [
        { t: 'Kiss her.', a: 2, set: 'kissed', then: [
          "n: You step closer. She meets you halfway, like she's been waiting at the halfway point for a while.",
          "n: The fairy lights hum. Far off, the glass car reaches the ground and starts back up.",
          "m: …Oh.",
          "m: Okay. Good. That's— good. That's very good.",
          "m: I'm going to have to rewrite the whole second verse.",
        ] },
        { t: 'Take her hand.', a: 1, set: 'hand', then: [
          "n: You take her hand. Her fingers are cold from the night air, and she laces them through yours like she's done it a hundred times.",
          "m: …Okay. Yeah.",
          "m: This is good. This is very good.",
        ] },
        { t: "Tell her it's the best song you've ever heard.", a: 1, then: [
          "n: She laughs, a little wobbly.",
          "m: You can't have heard that many songs.",
          "m: …Thank you. I mean it.",
        ] },
      ] },
      "m: Can we stay up here a while? I don't want to go back down to the wall yet.",
      "n: You stay until the sky behind the mountains starts to go grey.",
    ]);
    return 4;
  }

  // ======================================================================================
  // Chapter 5: Last Month.
  // ======================================================================================
  async function ch5() {
    Sound.music('sad');
    await rideScene(0.45);
    await say([
      "n: Autumn. The glass is cold to the touch now. She wears a scarf the color of the inside of a lemon.",
      "n: Tonight she doesn't say anything when the doors close. She's holding a piece of paper.",
      cab('close'),
      "m: Did you see the notice? On the landing?",
      { c: [
        { t: 'What notice?', then: ["n: She hands it to you without a word."] },
        { t: 'I saw it.', then: ["m: Then you know."] },
      ] },
      "n: OBSERVATION ELEVATOR: CLOSING. Owing to renovation, the exterior car will be permanently removed at the end of the month. Thank you for riding.",
      "m: They're taking it off the building. The whole car. They're putting in “premium event space.” There's going to be a bar. With a cover charge.",
      "m: It's stupid. It's an elevator. I'm a grown adult, and I'm upset about an elevator.",
      "n: She isn't crying. And then, a little, she is.",
      { c: [
        { t: "It's not stupid. It's your window.", a: 2, then: ["n: She laughs through it.", "m: It's my window. It's my stupid window.", "m: Thank you for not saying “it's just an elevator.” Everyone else said it's just an elevator."] },
        { t: 'Hey. Come here.', a: 2, set: 'held', then: ["n: You pull her in. She fits under your chin. The lemon scarf smells like cold air and the ramen stall.", "m: I'm getting snot on your coat.", "y: I know.", "m: …Sorry. Okay. I'm okay."] },
        { t: 'There are other windows.', then: ["m: I know. I know there are.", "n: She doesn't look like she knows."] },
      ] },
      face('view'), cab('two'),
      "m: The song's going to be about a thing that doesn't exist anymore. That's so like me.",
      "m: I met you in here. Did you know that's the first thing I tell people about you? “I met them in the glass elevator.”",
      "m: Like it's a real place. And it's not going to be a real place.",
      face('cam'), cab('close'),
      { if: (S) => S.flags.offered, then: ["m: You said once, the very first night, that I could borrow your window.", "m: I've been thinking about that a lot."] },
      { c: [
        { t: 'Come see my place. It has a window.', a: 2, then: ["n: She turns all the way round.", "m: …Your window.", "m: The one I've been getting moon pictures from for two months.", "m: Yes. Okay. Show me your window."] },
        { t: "We'll ride it every night until it closes.", a: 1, set: 'everyNight', then: ["m: Every night?", "m: Okay. Every night. Even the rainy ones.", "m: …And after?", "y: After, come and see my window.", "m: …Okay. Yes. After."] },
      ] },
      "n: The car reaches the bottom. For a long moment, neither of you moves to get off.",
    ]);
    await landRide();
    return 5;
  }

  // ======================================================================================
  // Chapter 6: A Window.
  // ======================================================================================
  async function ch6() {
    Sound.music('warm');
    Game.goTo('home', 'window');
    Game.shot(place('home', 'room'), true);
    Game.mikuFace('view');
    await fadeIn();
    await say([
      "n: Your apartment is on the fortieth floor of the tower across the road. You've never thought much about it. It was the place where your stuff was.",
      "n: Miku walks straight past everything, the sofa, the bookshelf, the keyboard you bought and never learned, to the glass.",
      pan('home', 'window'),
      "m: Oh.",
      "m: Oh, {name}.",
      pan('home', 'view'),
      "n: Across the road the tower rises out of the dark, and down its side, small and bright and slow, goes the glass car.",
      "m: You can see it from here. You can see our elevator from your living room.",
      cut('home', 'windowClose'), face('cam'),
      "m: How long have you lived here?",
      { c: [
        { t: 'About a year.', then: ["m: A YEAR. You've had this for a YEAR."] },
        { t: 'Since before I met you.', then: ["m: And you never SAID?"] },
      ] },
      "m: I'm going to stand here for maybe an hour. Is that okay? You can do other things. Go about your life.",
      face('view'),
      "n: She stands there for an hour. You don't do other things.",
      { do: () => Game.shot(place('home', 'room')) },
      "n: After that she comes over most nights. She learns where you keep the mugs. She names your plants: Gerald, Gerald Two, and Ms. Leek.",
      "n: She falls asleep on your sofa with her shoes on, wakes up embarrassed, and does it again two days later.",
      "n: Her toothbrush appears in your bathroom. Neither of you mentions it.",
      "n: Then one night, a week before the elevator closes for good, she's standing at the window again.",
      pan('home', 'window'),
      "m: My lease is up next month. The landlord's putting the rent up. For the wall.",
      "m: I've been looking at places. There's one with a window onto an alley. It's a very nice alley. There's a cat.",
      cut('home', 'windowClose'), face('cam'),
      { c: [
        { t: 'Move in with me.', then: [
          { if: (S) => S.aff >= TOGETHER,
            then: [
              "n: She doesn't say anything for a long moment.",
              "m: Are you sure? I'm messy. I sing in the shower. I'll sing in EVERY room. I can't cook.",
              "m: I'll put green onions in everything. Everything, {name}.",
              { c: [
                { t: 'I know.', a: 1 },
                { t: "That's the whole point.", a: 1 },
              ] },
              "m: …Okay.",
              "m: Okay! Yes! Yes. I'm going to live in a window.",
              "n: She laughs and cries at the same time, which you'll learn is something she does when she's happiest.",
              { do: (S) => { S.flags.together = true; } },
            ],
            else: [
              "n: She smiles. It's soft, and it's sad.",
              "m: {name}, I—",
              "m: I think I need to find my own window first. Does that make sense?",
              "m: I've been borrowing everybody's. The elevator's. Yours. I want one that's mine, before I share it.",
              { c: [
                { t: 'It makes sense.' },
                { t: "I'll wait.", then: ["m: Don't wait too long. I'm slow at everything."] },
              ] },
            ] },
        ] },
        { t: 'The alley place sounds nice.', then: [
          "m: Yeah. It does sound nice.",
          "n: She looks at your window for a long time, like she's memorizing it.",
        ] },
      ] },
    ]);
    return state.flags.together ? 6 : 7;
  }

  // ======================================================================================
  // Chapter 7: Home. A week together: each evening you choose what to do.
  // ======================================================================================
  const EVENINGS = {
    cook: { t: 'Cook dinner together', go: ['home', 'kitchen', 'kitchen'], script: [
      "m: I want to cook for you. I've been practicing.",
      "y: Where?",
      "m: In my head. Extensively.",
      "n: Twenty minutes later the smoke alarm is going off, and Miku is fanning it with a cutting board.",
      "m: It's FINE. It's fine. This is part of the process.",
      { c: [
        { t: 'What was it supposed to be?', then: ["m: Leek soup. It's a classic.", "y: It's black.", "m: It's a… dark classic."] },
        { t: 'Let me help.', a: 1, then: ["n: You take over the pan. She hovers at your elbow and narrates everything you do in a hushed voice, like a nature documentary.", "m: And here we see {name} in their natural habitat… adding salt. Incredible. Never before filmed."] },
        { t: 'Order ramen?', a: 1, then: ["m: (instantly) Yes. Extra green onions.", "m: …Don't tell anyone about the soup."] },
      ] },
      "n: You eat on the floor by the window, because the soup pan has claimed the table.",
      "m: This is the best dinner I've ever had. Don't fact-check that.",
    ] },
    movie: { t: 'Movie night on the sofa', go: ['home', 'sofa', 'sofa'], script: [
      "m: Movie night! I'm picking. You picked last time.",
      "y: We've never had a movie night.",
      "m: And yet I can feel that you picked last time.",
      "n: She picks a film about a little robot who spends seven hundred years cleaning up an empty planet. She cries at the opening credits.",
      "n: Halfway through, her head is on your shoulder. By the end she's asleep, and you don't move, even though your arm stopped existing an hour ago.",
      { c: [
        { t: 'Wake her gently.', then: ["m: (mumbling) Did the robot find love.", "y: The robot found love.", "m: Good. Good for him. He worked very hard."] },
        { t: 'Let her sleep.', a: 1, then: ["n: You pull the blanket over both of you and watch the glass car go up and down across the road until it stops for the night."] },
      ] },
    ] },
    music: { t: 'Work on the song at the keyboard', go: ['home', 'keys', 'keys'], script: [
      "n: She plays the same four chords over and over, frowning at them like they owe her money.",
      "m: Help me with the ending. You're the one who said it might not have one yet. So it's your fault. You're responsible.",
      "m: The last verse needs one line. The car gets to the bottom, and then… what? What happens at the bottom?",
      { c: [
        { t: 'The doors open.', a: 1, set: 'lineDoors', then: ["m: “And the doors open”… on what, though?", "n: She plays a chord, then a brighter one.", "m: …On the morning. They open on the morning."] },
        { t: "You're not alone anymore.", a: 1, set: 'lineAlone', then: ["n: Her hands stop on the keys.", "m: …Yeah. That's it. That's what happens."] },
        { t: 'We go home.', a: 1, set: 'lineHome', then: ["m: “We go home.” That's so simple it's stupid.", "m: …It's perfect. Ugh. I hate that it's perfect."] },
      ] },
      "n: She writes it on the back of her hand, because there's no paper.",
      "m: Don't read it. You'll jinx it. You'll hear it when it's finished.",
    ] },
    stall: { t: 'Date night at the ramen stall', go: ['stall', null, 'close'], script: [
      "m: Happy egg-iversary.",
      "y: That's not a thing.",
      "m: Two months ago tonight, at this very counter, a crime was committed.",
      { if: (S) => S.flags.eggWar, then: ["m: Two crimes. Let's be honest about the second crime."] },
      "n: The old man sets down two bowls. There are two eggs in hers and none in yours.",
      "m: He's on my side. Everyone is on my side.",
      { c: [
        { t: "I'll get you back for this.", then: ["m: You'll try."] },
        { t: "That's fair.", a: 1, then: ["n: She gives you one egg back. Then thinks about it, and takes half of it again."] },
      ] },
      "m: Can I tell you a thing? When I first came to this city, I ate here alone every night for a month.",
      "m: He never said anything. He just kept giving me extra green onions.",
      "m: I think that's how you know a place is home. Somebody knows your order.",
      "n: The old man, without turning round, puts extra green onions in your bowl too.",
    ] },
    park: { t: 'A walk in the park', go: ['park', null, 'wide'], script: [
      "m: Fireflies! In October! That's not even allowed!",
      pan('park', 'sky'),
      "m: Okay. Star lesson. That bright one, low down? Not a star. It's a plane. They're mostly planes. The city eats the stars.",
      "m: But that one, just above the tower. That one's real. I named it.",
      { c: [
        { t: 'What did you name it?', then: ["m: Gerald.", "y: After the saw guy?", "m: He deserves a star."] },
        { t: 'Can I name one?', a: 1, then: ["m: You can name the one next to it. Choose carefully. It's forever.", { c: [
          { t: '“Egg.”', then: ["m: …Okay, that's beautiful, actually. Gerald and Egg. Forever."] },
          { t: '“Miku.”', a: 1, then: ["n: She goes quiet.", "m: That's not fair. You can't just do that.", "n: She holds your hand the whole way home."] },
          { t: '“Window.”', then: ["m: Oh. Oh no. That's going to be in a song. I'm sorry. That's the rule."] },
        ] }] },
      ] },
      cut('park', 'close'),
      "m: My mom used to say you can tell a good person by how they walk in a park. Whether they look up.",
      "m: You look up. I noticed that, the first night. You kept looking out instead of down.",
    ] },
    laundry: { t: 'Laundry day', go: ['home', 'sofa', 'sofa'], script: [
      "n: Laundry day. You discover that Miku folds T-shirts into perfect tiny squares, like origami, and that this takes her about forty minutes a shirt.",
      "m: It's efficient! Look how small it is!",
      "y: It took forty minutes.",
      "m: Efficient for SPACE. Not for TIME. They're different efficiencies.",
      { c: [
        { t: 'Teach me.', a: 1, then: ["n: She teaches you. Yours come out like crumpled sandwiches. She keeps them anyway, in their own special pile."] },
        { t: 'Do mine too.', then: ["m: Absolutely not. I have a craft to protect."] },
      ] },
      "m: You know what I like? Your shirts and my shirts in the same drawer.",
      "m: That's a stupid thing to like.",
      { c: [
        { t: "It's not stupid.", a: 1, then: ["m: …No. It's not."] },
        { t: 'I like it too.', a: 1 },
      ] },
    ] },
    rain: { t: 'Stay in and watch the rain', go: ['home', 'window', 'window'], script: [
      "n: It rains for the first time since she moved in. The city goes soft and smeared, every light a watercolor.",
      { do: () => Game.mikuFace('view') },
      "m: The elevator's still running. Look. Even in the rain.",
      { do: () => Game.mikuFace('cam') },
      "m: A few more nights.",
      { c: [
        { t: 'Are you okay?', a: 1, then: ["m: Yeah. I am, actually.", "m: I thought I'd be sadder. But I've got a window now.", "m: …I've got a you now. That's better than a window. Don't tell the window."] },
        { t: "We'll ride it on the very last night.", a: 1, set: 'promise', then: ["m: The very last ride. Promise?", "y: Promise.", "m: Pinky promise. That's binding. That's a legal contract."] },
      ] },
    ] },
  };
  const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
  const HOME_CHAT = [
    "m: Did you know your fridge hums in B flat? I've been harmonizing with it.",
    "m: I named the fish. Don't ask me what I named them. …Gerald, Gerald Two, and Egg.",
    "m: I keep waking up and forgetting I live here. Then I see the window and remember. Every time, it's like a present.",
    "m: The old man at the stall asked about you. I told him you're the egg thief. He laughed so hard. Ha!",
    "m: Your shirts smell like your shirts. That's not a sentence. You know what I mean.",
    "m: I wrote a verse about the sound your keys make in the door. It's not good. I'm keeping it.",
  ];
  let chatI = 0;
  const pickLine = (list) => list[chatI++ % list.length];
  const clearHooks = () => { for (const k in Game.hooks) Game.hooks[k] = null; Game.setUsables([]); };

  // ---------- At home ----------
  // The things you can use in your apartment. `canSleep` is true, or a reason you can't yet;
  // `onSleep` ends the day. `withMiku`: she's home too (no going out alone).
  function homeUsables(canSleep, onSleep, withMiku) {
    const at = Game.places.home.at;
    Game.hooks.phone = () => Life.openPhone();
    Game.setUsables([
      { ...at.computer, r: 1.3, label: 'Use the computer', use: () => Life.openPC() },
      { ...at.bed, r: 1.5, label: 'Go to bed', use: async () => {
        const ok = canSleep();
        if (ok !== true) { Game.hint(ok, 3); return; }
        let yes = false;
        await say([{ c: [{ t: 'Go to sleep', then: [{ do: () => { yes = true; } }] }, { t: 'Not yet' }] }]);
        if (yes) { clearHooks(); onSleep(); }
      } },
      { ...at.door, r: 1.4, label: withMiku ? 'Front door' : 'Go out', use: () => (withMiku ? Game.hint("You're staying in with Miku tonight.", 3) : goOut()) },
      { ...at.window, r: 1.6, label: 'Look out of the window', use: () => say([pickLine(VIEW_LINES)]) },
      { ...at.keys, r: 1.3, label: 'Play the keyboard', use: () => { Sound.chime(); say([state.flags.number ? "n: You plunk out the first few notes of her song with one finger. It sounds better when she plays it." : "n: You play the three notes you know. The keyboard is mostly a very expensive shelf."]); } },
    ]);
  }
  const VIEW_LINES = [
    "n: Across the road the tower goes up into the dark. Down its side, small and slow, slides the glass car.",
    "n: Somewhere down there, a bus sighs at a stop. Up here it's just the hum of the fridge and the lights.",
    "n: You count windows for a while. You lose count somewhere around four hundred.",
    "n: The red lights on the rooftops blink at nobody. You wave back, just in case.",
  ];

  // A day at home between the story's nights. Ends when you go to bed.
  const CONVO_BEFORE = { 3: 'c3', 4: 'c4', 5: 'c5' };
  async function homeDay(next) {
    Sound.music(next >= 5 ? 'sad' : 'warm');
    if (next === 1) {
      await say([
        "n: You get home a little after one in the morning. Your apartment is on the fortieth floor of the tower across the road.",
        "n: You can't stop thinking about the girl in the glass elevator.",
      ]);
    }
    Life.startDay(next === 7 ? 'c6a' : CONVO_BEFORE[next]);
    Game.enterHome(Game.places.home.at.start, null);
    Life.hud(true);
    await fadeIn();
    if (next === 1) Game.hint('This is home. Walk with WASD, look with the mouse, press E to use things, Q for your phone.', 9);
    else Game.hint('Q for your phone · the computer is on the desk · bed is through the back door', 6);
    await new Promise((resolve) => homeUsables(() => true, resolve, false));
    Life.endDay();
  }

  // Going out: the ramen stall or the park, on your own (and maybe she's there).
  async function goOut() {
    let where = null;
    await say([
      "n: Where to?",
      { c: [
        { t: 'The ramen stall ($8)', then: [{ do: () => { where = 'stall'; } }] },
        { t: 'A walk in the park', then: [{ do: () => { where = 'park'; } }] },
        { t: 'Stay in' },
      ] },
    ]);
    if (!where) return;
    if (where === 'stall' && state.money < 8) { Game.hint('You check your wallet. Maybe not tonight.', 3); return; }
    const usables = Game.hooks.phone;
    Life.hud(false);
    await fadeOut();
    const meet = where === 'stall' && state.flags.number && !state.flags.metAtStall;
    Game.goTo(where);
    if (!meet) Game.miku.obj.visible = false;
    Game.shot(place(where, where === 'stall' ? 'close' : 'wide'), true);
    Game.mikuFace('cam');
    await fadeIn();
    if (where === 'stall') {
      state.money -= 8;
      Sound.blip('coin');
      if (meet) {
        state.flags.metAtStall = true;
        await say([
          "n: There's someone already at the counter, hunched over a bowl, with a pencil in her hair.",
          "m: …{name}? Are you following me?",
          { c: [
            { t: 'I could ask you the same thing.', a: 1, then: ["m: I was here first! The old man is my witness.", "n: The old man does not look up. He puts extra green onions in your bowl."] },
            { t: 'Maybe a little.', a: 2, then: ["m: Oh. Okay. Ha! That's… okay. That's fine. Sit down."] },
          ] },
          "n: You eat side by side without saying much. It's the nicest quiet you've had in a while.",
          "m: Same time tomorrow. Remember. You promised the elevator.",
        ]);
      } else {
        await say([
          "n: The old man nods at you like you're a regular. Maybe you are now.",
          "n: The ramen is hot and salty and exactly right. You eat it watching the glass car go up and down the tower.",
          ...(state.flags.number ? ["n: You take a picture of the bowl and send it to Miku. She replies in seconds: “EXTRA GREEN ONIONS?? 😤”"] : []),
        ]);
      }
    } else {
      await say([
        "n: The park is quiet. A few fireflies drift between the trees, much too late in the year.",
        "n: Above the tower, one star is bright enough to beat the city.",
        ...(state.flags.number ? ["n: You send Miku a picture of it. She sends back: “that one's mine. i named it.”"] : []),
      ]);
    }
    await fadeOut();
    Game.enterHome(Game.places.home.at.start, null);
    Game.hooks.phone = usables;
    Life.hud(true);
    await fadeIn();
  }

  async function ch7() {
    Sound.music('warm');
    Game.goTo('home', 'door');
    Game.shot(place('home', 'door'), true);
    Game.mikuFace('cam');
    await fadeIn();
    await say([
      "n: She moves in on a Saturday with four boxes, a keyboard, and a bag of green onions “for luck.”",
      "m: I'm home!",
      "m: …I'm home. I'm going to say that every single day. You can't stop me.",
      pan('home', 'room'),
      "n: The elevator closes on Thursday night. Until then, you have a week.",
    ]);
    // Each day of the week: you're at home with her, free to wander. Talk to her to choose the
    // evening (or give her a gift, or just chat), then go to bed.
    const SPOTS = ['window', 'kitchen', 'couch', 'keys', 'desk'];
    for (let d = state.evenings.length; d < DAYS.length; d++) {
      await fadeOut();
      await card('Home', DAYS[d], `${DAYS.length - d} ${DAYS.length - d === 1 ? 'night' : 'nights'} until the last ride`, 2.4);
      Life.startDay(null);
      const spot = SPOTS[d % SPOTS.length];
      let spent = false;
      const enter = () => { Game.enterHome(Game.places.home.at.bedside, spot); Game.mikuFace('view'); Life.hud(true); };
      enter();
      await fadeIn();
      Game.hint(d === 0 ? 'Miku lives here now. Walk over and press E to talk to her.' : 'Talk to Miku to decide what to do tonight.', 6);
      await new Promise((resolve) => {
        homeUsables(() => (spent ? true : 'Spend the evening with Miku first.'), resolve, true);
        Game.hooks.talk = async () => {
          Game.mikuFace('player');
          let pick = null, gift = null;
          const left = Object.keys(EVENINGS).filter((k) => !state.evenings.includes(k));
          const bag = Life.giftsInBag();
          await say([
            spent ? pickLine(HOME_CHAT) : d === 0 ? "m: First night as roommates! What should we do?" : d === DAYS.length - 1 ? "m: Last free night before the last ride. What do you want to do?" : "m: What should we do tonight?",
            { c: [
              ...(spent ? [] : [{ t: 'Plan tonight…', then: [{ c: [...left.map((k) => ({ t: EVENINGS[k].t, then: [{ do: () => { pick = k; } }] })), { t: 'Back' }] }] }]),
              ...(bag.length ? [{ t: 'Give her something…', then: [{ c: [...bag.map((k) => ({ t: Life.GIFTS[k].name, then: [{ do: () => { gift = k; } }] })), { t: 'Back' }] }] }] : []),
              { t: 'Just chat', then: [pickLine(HOME_CHAT)] },
              { t: 'Never mind', then: [] },
            ] },
          ]);
          if (gift) {
            Life.takeGift(gift);
            await say(Life.giftToMiku(gift, false).map((l) => 'm: ' + l));
          }
          Game.mikuFace('view');
          if (!pick) return;
          state.evenings.push(pick);
          const ev = EVENINGS[pick];
          const [where, sp, shotName] = ev.go;
          Life.hud(false);
          await fadeOut();
          Game.goTo(where, sp);
          Game.shot(place(where, shotName), true);
          Game.mikuFace('cam');
          await fadeIn();
          await say(ev.script);
          try { Life.addPhoto(Game.snapshot(), DAYS[d] + ': ' + ev.t); } catch (e) { /* no photo */ }
          await fadeOut();
          spent = true;
          enter();
          await fadeIn();
          Game.hint("It's getting late. Go to bed when you're ready.", 5);
          save.snaps[6] = snapshot(); persist();
        };
      });
      Life.endDay();
    }
    clearHooks();
    Life.hud(false);
    Game.places.home.photo.visible = true;
    await fadeOut();
    Game.goTo('home', 'window');
    Game.shot(place('home', 'window'), true);
    Game.mikuFace('view');
    await fadeIn();
    await say([
      "n: Thursday. There's a new picture on the wall by the bookshelf: the two of you at the ramen stall, blurry, both mid-laugh. The old man took it.",
      "m: Last night. Last ride.",
      { do: () => Game.mikuFace('cam') },
      "m: Set an alarm for four. I want to be on it when the sun comes up.",
    ]);
    return 7;
  }

  // ======================================================================================
  // Chapter 8: Seventy Floors. The last ride.
  // ======================================================================================
  function finalLine(S) {
    if (S.flags.lineDoors) return 's: And the doors open up on the morning light / and you were there beside me all night';
    if (S.flags.lineAlone) return "s: And at the bottom of the longest ride / I wasn't alone, you were by my side";
    if (S.flags.lineHome) return 's: And at the bottom, when the ride is done / we go home, we go home, and the night is gone';
    return 's: And at the bottom of the longest ride / you were waiting there, you were by my side';
  }

  async function ch8() {
    const together = !!state.flags.together;
    Sound.music('sad');
    Game.dawn(0);
    await rideScene(0.55);
    if (together) {
      await say([
        "n: The last night. Someone has written underneath the notice on the landing, in marker: THANK YOU FOR RIDING. And a small heart.",
        "n: It's twenty to five in the morning. You're both in your coats. She's brought a thermos and two cups.",
        "m: Last ride. Okay. I'm fine. I'm totally fine.",
        "n: She is not totally fine. She holds your hand so hard your fingers go white.",
        cab('close'),
        "m: I finished it. The song. Last night, while you were asleep. I wrote it on the back of the elevator notice.",
        "m: Can I sing you the whole thing? In here? While it still exists?",
        { c: [{ t: 'Please.' }, { t: "I've been waiting since floor seventy.", a: 1 }] },
      ]);
    } else {
      await say([
        "n: The last night. She texted you at midnight: “last ride. 4:40. the usual car.”",
        "n: She's already inside when you get there, with a thermos and two cups.",
        "m: You came. Of course you came.",
        cab('close'),
        "m: I signed for the alley place. The cat's name is Admiral. He's enormous. He hates me. It's wonderful.",
        "m: I finished the song. Can I sing it to you? In here? While it still exists?",
        { c: [{ t: 'Please.' }, { t: 'I was hoping you would.' }] },
      ]);
    }
    await say([
      face('view'), cab('view'), music('song'), dawn(0.35),
      "s: Seventy floors of the city at night / every window somebody holding on tight",
      "s: I count them going down, I lose my place / I start again from the top, I keep the pace",
      cab('two'),
      "s: You got lost on your way to somewhere else / and found me counting windows by myself",
      "s: And all the way down, all the way down / I wasn't the only one awake in this town",
      dawn(0.7), cab('side'),
      "s: They're taking down the glass, they're taking down the sky / I used to think up here was where I learned to fly",
      "s: But a window's just a window till somebody's there / to stand beside you, and to stand and stare",
      cab('view'), dawn(1),
      's: So all the way down, all the way down',
      together ? finalLine(state) : "s: I'll find my own window somewhere in this town",
    ]);
    await say([
      "n: She sings the last line as the car slides past the tenth floor. The sun comes up over the mountains, and for one moment every window in the city turns gold.",
      music('warm'), face('cam'), cab('close'),
      "m: …That's the ending.",
    ]);
    if (together) {
      await say([
        "m: It had one all along. It just needed you to be in it.",
        { c: [
          { t: 'I love you.', then: [
            "n: Her face does something complicated and wonderful.",
            "m: I love you. I've loved you since floor forty-nine, the very first night.",
            { if: (S) => S.flags.lost, then: ["m: When you told me you'd got lost.", "m: I'm so glad you got lost."], else: ["m: When you told me why you were up here. I just knew. It was very annoying."] },
          ] },
          { t: 'That was perfect.', then: [
            "m: It was okay. It was perfect. Shut up.",
            "m: …I love you, by the way. I've been saving it for in here. I wanted the elevator to hear.",
            "y: I love you too.",
          ] },
        ] },
      ]);
      await landRide();
      await say([
        "n: The car settles at the bottom for the last time. The doors open on a street full of morning.",
        "m: Okay. Okay.",
        "m: Let's go home.",
      ]);
      return 'home';
    }
    await say([
      "m: It's not a sad song. I want you to know that. It's a thank-you song.",
      { c: [
        { t: 'Thank you for the ride.', then: ["m: Thank you for getting lost."] },
        { t: 'Maybe someday, another elevator.', then: ["n: She smiles.", "m: Maybe someday. Somewhere with a lot of floors."] },
      ] },
    ]);
    await landRide();
    await say([
      "n: At the bottom she squeezes your hand once, and steps out into the morning, and turns up her collar, and the city takes her.",
      "n: A year later, you hear the song on the radio at the ramen stall. The old man turns it up without being asked.",
    ]);
    return 'window';
  }

  const CHAPTERS = [
    { title: 'Floor 70', sub: 'Midnight. Going down.', run: ch1 },
    { title: 'Same Time Tomorrow', sub: 'Two coffees from the machine on the landing.', run: ch2 },
    { title: 'The Blue Room', sub: 'Eleven chairs, a saw, and a ramen stall.', run: ch3 },
    { title: 'Up on the Roof', sub: "Don't take the elevator tonight.", run: ch4 },
    { title: 'Last Month', sub: 'A notice on the landing.', run: ch5 },
    { title: 'A Window', sub: 'The fortieth floor, across the road.', run: ch6 },
    { title: 'Home', sub: 'One week.', run: ch7 },
    { title: 'Seventy Floors', sub: 'The last ride.', run: ch8 },
  ];
  const NUMS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

  const ENDINGS = {
    home: { title: 'Home', sub: 'You found the ending together.' },
    window: { title: 'A Window of Her Own', sub: 'A little braver, a little warmer, and the story might end another way.' },
  };

  // ---------- Running chapters ----------
  // Chapters, with a day at home between them (before chapters 2 to 6, and before the last
  // ride if she's not moving in). Progress saves at the start of each chapter and each home day.
  const homeBefore = (i) => (i >= 1 && i <= 5) || (i === 7 && !state.flags.together);
  async function play(n, atHome) {
    let i = n;
    while (typeof i === 'number') {
      if (!atHome) {
        save.current = i; save.home = false;
        save.snaps[i] = snapshot();
        persist();
        Game.dawn(0);
        Life.showDecor();
        await card('Chapter ' + NUMS[i], CHAPTERS[i].title, CHAPTERS[i].sub);
        const next = await CHAPTERS[i].run();
        try { Life.addPhoto(Game.snapshot(), CHAPTERS[i].title); } catch (e) { /* no photo */ }
        await fadeOut();
        Life.hud(false);
        clearHooks();
        i = next;
        if (typeof i !== 'number') break;
      }
      atHome = false;
      if (homeBefore(i)) {
        save.current = i; save.home = true;
        save.snaps[i] = snapshot();
        persist();
        await homeDay(i);
        await fadeOut();
        Life.hud(false);
      }
    }
    await ending(i);
  }

  async function ending(key) {
    const e = ENDINGS[key];
    if (!save.endings.includes(key)) save.endings.push(key);
    save.current = 0;
    persist();
    Sound.music(key === 'home' ? 'warm' : 'sad');
    await card('Ending', e.title, e.sub, 5);
    const found = Object.keys(ENDINGS).filter((k) => save.endings.includes(k)).map((k) => ENDINGS[k].title);
    $('credits-endings').textContent = `Endings found: ${found.length} of ${Object.keys(ENDINGS).length}. ${found.join(' · ')}`;
    $('credits').classList.remove('hidden');
  }

  // ---------- Title screen ----------
  function updateMuteLabels() {
    document.querySelectorAll('.mute-toggle').forEach((b) => { b.innerHTML = '<span>' + (Sound.muted ? 'Sound: off' : 'Sound: on') + '</span>'; });
  }

  // Drifting specks of light on the title screen, like bokeh from the city.
  function particles() {
    const box = $('particles');
    for (let i = 0; i < 38; i++) {
      const p = document.createElement('i');
      const s = 2 + Math.random() * 7;
      p.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${14 + Math.random() * 22}s;animation-delay:${-Math.random() * 30}s;opacity:${0.15 + Math.random() * 0.5};--drift:${(Math.random() - 0.5) * 120}px;filter:blur(${Math.random() < 0.4 ? 2 : 0}px);background:${Math.random() < 0.7 ? '#7ff0e6' : '#ffd9a0'}`;
      box.appendChild(p);
    }
  }
  // A loading bar while her model loads: it eases toward full, and fills when she's ready.
  function loadingBar() {
    const bar = $('loading').querySelector('i');
    let k = 0;
    const tick = () => {
      if (Game.ready) { bar.style.width = '100%'; setTimeout(() => $('loading').classList.add('done'), 400); return; }
      k += (0.92 - k) * 0.02;
      bar.style.width = (k * 100).toFixed(1) + '%';
      requestAnimationFrame(tick);
    };
    tick();
  }

  function boot() {
    Talk.init(state);
    Life.init(state);
    Settings.bind();
    Settings.apply();
    particles();
    loadingBar();
    $('open-settings').addEventListener('click', () => Settings.open());
    $('pause-settings').addEventListener('click', () => Settings.open());
    $('pause-quit').addEventListener('click', () => location.reload());
    const startBtn = $('start'), contBtn = $('continue');
    startBtn.disabled = true; startBtn.textContent = 'Loading…';
    const hasSave = save.current > 0 && save.snaps[save.current];
    if (hasSave) {
      contBtn.classList.remove('hidden');
      contBtn.innerHTML = '<span>' + (save.home ? `Continue · Day ${save.snaps[save.current].day || ''} at home` : `Continue · ${CHAPTERS[save.current].title}`) + '</span>';
    }
    // Chapter select, once you've reached an ending.
    if (save.endings.length) {
      const list = $('chapters');
      list.classList.remove('hidden');
      list.innerHTML = '<p>Chapters</p>' + CHAPTERS.map((c, i) => (save.snaps[i] ? `<button data-ch="${i}"><b>${String(i + 1).padStart(2, '0')}</b>${c.title}</button>` : '')).join('');
      list.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) begin(Number(b.dataset.ch)); });
    }
    startBtn.innerHTML = '<span>Loading…</span>';
    Game.onReady(() => { startBtn.disabled = false; startBtn.innerHTML = '<span>' + (hasSave ? 'New story' : 'Begin') + '</span>'; });
    startBtn.addEventListener('click', () => { if (!startBtn.disabled) begin(0, true); });
    contBtn.addEventListener('click', () => begin(save.current));
    document.querySelectorAll('.mute-toggle').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); Sound.toggleMute(); updateMuteLabels(); }));
    document.addEventListener('mutechange', updateMuteLabels);
    // Her speaking voice: whichever text-to-speech voices this computer has.
    updateMuteLabels();
    $('credits-back').addEventListener('click', () => location.reload());
    // In cinematic scenes, clicking anywhere moves the text on.
    $('view').addEventListener('click', () => { if (Game.state.mode === 'scene' && Talk.active) Talk.key('Space'); });
  }

  let begun = false;
  async function begin(n, fresh) {
    if (begun || !Game.ready) return;
    begun = true;
    Sound.start();
    if (fresh || !save.snaps[n]) restore({ aff: 0, flags: {}, name: '', evenings: [] });
    else restore(save.snaps[n]);
    if (fresh) { save.snaps = {}; save.home = false; }
    $('title').classList.add('leaving');
    setTimeout(() => $('title').classList.add('hidden'), 1300);
    await fadeOut();
    play(n, !fresh && n === save.current && save.home);
  }

  return { state, boot, get save() { return save; }, _play: play, _restore: restore };
})();
