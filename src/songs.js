// The idol songs, synthesized, each with its own sound: classic idol pop, summer ska, a piano
// ballad, synthwave, swung city pop, chiptune "denpa", late-night lo-fi, an arena rock anthem,
// an orchestral epic for the Dome, and Teto's trap-metal. Every song has its own chords,
// melodies, drums, bass and instruments.
//
// Miku sings the words. Her voice is built additively, harmonic by harmonic, from the
// formants of each vowel at the pitch being sung, so the vowels come out clear. Consonants are
// placed just ahead of the beat the way singers do: hiss for s and sh, bursts for k, t and p,
// a hum for m and n, glides for y and w, a flick for r. Notes glide into each other with a
// little overshoot and late vibrato, the Vocaloid way. The group sings harmony on the big
// choruses; there are choir "aah"s and chopped-up vocal riffs. Each lyric line is fitted to
// the melody so every syllable gets its own note. The stage chart comes from the sung melody,
// so the notes you hit are the syllables you hear.

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];

// A hook: four bars of [beat, scale step, length in beats]; step 7 is the octave. Chord
// progressions are scale degrees, one per bar (0 = I, 3 = IV, 4 = V, 5 = vi...).
const SONGS = {
  snowdrop: {
    title: 'Snowdrop Heart', artist: 'Miku', bpm: 150, root: 69, scale: MAJOR, unlock: () => true, stars: 1, style: 'idol',
    mood: 'Bright and hopeful: the first song she ever sang in the city.',
    verse: [0, 5, 3, 4], pre: [1, 2, 3, 4], chorus: [3, 4, 2, 5], bridge: [5, 3, 0, 4],
    hookV: [[0, 2, 0.5], [0.5, 2, 0.5], [1, 4, 0.5], [1.5, 4, 0.5], [2, 5, 1], [3, 4, 1], [4, 2, 0.5], [4.5, 1, 0.5], [5, 2, 1], [6, 0, 2], [8, 2, 0.5], [8.5, 2, 0.5], [9, 4, 0.5], [9.5, 5, 0.5], [10, 7, 1], [11, 5, 1], [12, 4, 0.5], [12.5, 5, 0.5], [13, 4, 1], [14, 2, 2]],
    hookP: [[0, 4, 1], [1, 5, 1], [2, 6, 1], [3, 7, 1], [4, 5, 1.5], [5.5, 6, 0.5], [6, 7, 2], [8, 6, 1], [9, 7, 1], [10, 8, 1], [11, 9, 1], [12, 8, 2], [14, 7, 1], [15, 6, 1]],
    hookC: [[0, 7, 1], [1, 7, 0.5], [1.5, 8, 0.5], [2, 9, 1], [3, 8, 0.5], [3.5, 7, 0.5], [4, 8, 1], [5, 7, 0.5], [5.5, 6, 0.5], [6, 7, 2], [8, 7, 0.5], [8.5, 8, 0.5], [9, 9, 1], [10, 10, 1], [11, 9, 0.5], [11.5, 8, 0.5], [12, 9, 1.5], [13.5, 8, 0.5], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    chops: 'ra ra ri ra ru ra ri ra',
    lyrics: {
      verse: [
        ['shi ro i yu ki no na ka de hi to ri ki e so u', 'Alone in the white snow, about to fade away'],
        ['ko go e ta yu bi sa ki ni ha na ga sa i ta no', 'and on my frozen fingertips, a flower bloomed'],
        ['ka ze ga fu i te mo ma da ke se na i hi ka ri', 'Even when the wind blows, a light that won\'t go out'],
        ['a no so ra no mu ko u ni ki mi ga ma te ru yo', 'Somewhere past that sky, you\'re waiting for me'],
      ],
      pre: [['to do ke to do ke ko no ko e yo ha ru ma de', 'Reach them, reach them, this voice of mine, all the way to spring']],
      chorus: [
        ['su no o do ro p pu ha a to yu ki wo to ka shi te sa i te', 'Snowdrop Heart, melt the snow and bloom'],
        ['na i te mo i i yo mo u i chi do ta chi a ga re ba i i', 'It\'s okay to cry, as long as you get up once more'],
      ],
      bridge: [['sa mu i yo ru mo mo u ko wa ku na i', 'Even the cold nights don\'t scare me any more']],
    },
  },
  ramune: {
    title: 'Summer Ramune', artist: 'Miku', bpm: 156, root: 62, scale: MAJOR, unlock: () => fameLevel() >= 1, stars: 1, style: 'ska',
    mood: 'Fizzy, sunny, a song for the beach: offbeat guitars, horns and a marimba.',
    verse: [0, 3, 0, 4], pre: [5, 3, 4, 4], chorus: [0, 4, 5, 3], bridge: [3, 4, 2, 5],
    hookV: [[0, 4, 0.5], [0.5, 4, 0.25], [0.75, 5, 0.75], [1.5, 4, 0.5], [2, 2, 1], [3.5, 4, 0.5], [4, 5, 1], [5, 4, 0.5], [5.5, 2, 1.5], [8, 4, 0.5], [8.5, 4, 0.25], [8.75, 5, 0.75], [9.5, 7, 0.5], [10, 5, 1], [11.5, 4, 0.5], [12, 2, 0.5], [12.5, 1, 0.5], [13, 0, 2]],
    hookP: [[0, 2, 0.5], [0.5, 4, 0.5], [1, 5, 1], [2, 7, 1], [4, 5, 0.5], [4.5, 7, 0.5], [5, 8, 1], [6, 7, 2], [8, 5, 0.5], [8.5, 7, 0.5], [9, 8, 1], [10, 9, 1], [12, 8, 1], [13, 7, 1], [14, 6, 2]],
    hookC: [[0, 9, 0.75], [0.75, 9, 0.25], [1, 8, 0.5], [1.5, 7, 1], [2.5, 8, 0.5], [3, 9, 1], [4, 7, 0.5], [4.5, 5, 0.5], [5, 7, 1], [6, 4, 2], [8, 9, 0.75], [8.75, 9, 0.25], [9, 10, 0.5], [9.5, 11, 0.5], [10, 9, 1], [11, 8, 0.5], [11.5, 7, 1.5], [13, 8, 0.5], [13.5, 7, 0.5], [14, 7, 2]],
    form: ['intro', 'chorus', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
    chops: 'shu wa shu wa pa pa ya ya',
    lyrics: {
      verse: [
        ['ra mu ne no bi i da ma ko ro ga shi te', 'Rolling the marble in a bottle of ramune'],
        ['na tsu no hi za shi ni me wo ho so me ta', 'squinting into the summer sun'],
        ['ha da shi de ha shi ru su na ha ma ma de', 'Running barefoot all the way to the sand'],
        ['u mi no o to ga mu ne ni hi bi i te', 'the sound of the sea echoing in my chest'],
      ],
      pre: [['shu wa shu wa ha ji ke ru ki mo chi wo da ki shi me', 'Fizz, fizz, holding on to this feeling as it bursts']],
      chorus: [
        ['sa ma a ra mu ne shu wa t to ko i shi te ne', 'Summer ramune, fall in love with a fizz'],
        ['a o zo ra ni to ke ru ma de wa ra t te yo', 'Laugh until we melt into the blue sky'],
      ],
    },
  },
  paperplane: {
    title: 'Paper Plane Promise', artist: 'SNOWDROP', bpm: 84, root: 62, scale: MAJOR, unlock: () => idol.flags.lyricsDone || fameLevel() >= 5, stars: 1, style: 'ballad',
    mood: 'A piano ballad, for the friends who got her here.',
    verse: [0, 2, 5, 3], pre: [1, 4, 2, 5], chorus: [0, 4, 5, 2, 3, 0, 3, 4], bridge: [5, 4, 3, 4],
    hookV: [[0, 4, 1], [1, 2, 0.5], [1.5, 4, 0.5], [2, 5, 1], [3, 4, 0.5], [3.5, 2, 0.5], [4, 1, 1], [5, 2, 0.5], [5.5, 1, 0.5], [6, 0, 2], [8, 2, 1], [9, 1, 0.5], [9.5, 2, 0.5], [10, 4, 1], [11, 5, 0.5], [11.5, 4, 0.5], [12, 5, 1], [13, 4, 0.5], [13.5, 2, 0.5], [14, 4, 2]],
    hookP: [[0, 5, 1], [1, 4, 0.5], [1.5, 5, 0.5], [2, 7, 2], [4, 6, 1], [5, 5, 0.5], [5.5, 6, 0.5], [6, 8, 2], [8, 7, 1], [9, 8, 0.5], [9.5, 9, 0.5], [10, 9, 1], [11, 8, 1], [12, 7, 2], [14, 6, 2]],
    hookC: [[0, 9, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 8, 1], [3, 9, 1], [4, 7, 1.5], [5.5, 5, 0.5], [6, 7, 2], [8, 8, 1], [9, 7, 0.5], [9.5, 6, 0.5], [10, 7, 1], [11, 8, 1], [12, 9, 1.5], [13.5, 8, 0.5], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['ka mi hi ko u ki ni ka i ta ya ku so ku hi to tsu', 'On a paper plane I wrote just one promise'],
        ['ka ze ni no se te to ba shi ta ki mi no ma do ma de', 'I set it on the wind, all the way to your window'],
        ['hi to ri ja na i to shi t ta no wa a no fu yu no hi', 'It was that winter day I learned I\'m not alone'],
        ['te wo tsu na i de a ru ku mi chi ga ki ra ki ra shi te ru', 'The road we walk hand in hand is sparkling'],
      ],
      pre: [['na ga re bo shi ni ne ga u yo ri mo ji bu n de', 'Rather than wish on a shooting star, I\'ll catch it myself']],
      chorus: [
        ['ki re i na mo no wa tsu zu ka na i ne', 'Beautiful things never last'],
        ['da ka ra i ma ko ko de mi te i te ne', 'so watch them now, right here'],
        ['ka mi hi ko u ki ga so ra ni to ke te ku', 'The paper plane melts into the sky'],
        ['ya ku so ku da yo zu t to to mo da chi', 'It\'s a promise: friends forever'],
      ],
      bridge: [['ha na re te mo o na ji so ra no shi ta', 'Even apart, we\'re under the same sky']],
    },
  },
  sakura: {
    title: 'Neon Sakura Drive', artist: 'SNOWDROP', bpm: 112, root: 65, scale: MINOR, unlock: () => !!idol.flags.joined, stars: 2, style: 'synthwave',
    mood: 'Night lights and petals on the wind: synthwave, their first single as a group.',
    verse: [0, 5, 2, 6], pre: [3, 4, 3, 4], chorus: [5, 6, 0, 4], bridge: [3, 0, 4, 5],
    hookV: [[0, 0, 0.5], [0.5, 2, 0.5], [1, 4, 0.5], [1.5, 5, 0.5], [2, 4, 1], [3, 2, 0.5], [3.5, 4, 0.5], [4, 5, 1.5], [5.5, 4, 0.5], [6, 2, 2], [8, 0, 0.5], [8.5, 2, 0.5], [9, 4, 0.5], [9.5, 5, 0.5], [10, 7, 1], [11, 5, 0.5], [11.5, 4, 0.5], [12, 5, 2], [14, 4, 1], [15, 2, 1]],
    hookP: [[0, 5, 0.5], [0.5, 5, 0.5], [1, 5, 0.5], [1.5, 6, 0.5], [2, 7, 2], [4, 6, 0.5], [4.5, 6, 0.5], [5, 6, 0.5], [5.5, 7, 0.5], [6, 8, 2], [8, 7, 0.5], [8.5, 8, 0.5], [9, 9, 1], [10, 8, 0.5], [10.5, 9, 0.5], [11, 10, 1], [12, 11, 4]],
    hookC: [[0, 9, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 8, 1.5], [3.5, 7, 0.5], [4, 5, 1], [5, 7, 1], [6, 4, 2], [8, 7, 1], [9, 8, 0.5], [9.5, 9, 0.5], [10, 11, 1.5], [11.5, 9, 0.5], [12, 8, 1], [13, 7, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    chops: 'ne o n ne o n sa ku ra',
    lyrics: {
      verse: [
        ['ne o n no ma chi ni sa ku ra ga ma u yo ru ni ki mi', 'In the neon town, on a night of dancing petals, you'],
        ['a ka i shi n go u mo i ma da ke wa ki ni shi na i', 'Even the red lights, just for tonight, we won\'t mind them'],
        ['ha shi ri da shi ta ki mo chi wa to ma ra na i no yo', 'This feeling that\'s started running just won\'t stop'],
        ['ka ga mi no na ka no wa ta shi ga wa ra t te ru', 'I can see myself smiling in the mirror'],
      ],
      pre: [['ra i to wo tsu ke te bo ri u mu a ge te ko n ya', 'Lights on, volume up, tonight']],
      chorus: [
        ['ne o n sa ku ra do ra i bu ma chi wo ka ke nu ke', 'Neon Sakura Drive, racing through the town'],
        ['fu ta ri da ke no se ka i ni a sa ga ku ru ma de', 'in a world for just us two, until the morning comes'],
      ],
      bridge: [['ha na bi ra ga ki e te mo wa su re na i ze t ta i', 'Even when the petals are gone, I\'ll never forget']],
    },
  },
  pastel: {
    title: 'Pastel Rain', artist: 'SNOWDROP', bpm: 108, root: 66, scale: MAJOR, unlock: () => !!idol.flags.joined && fameLevel() >= 4, stars: 2, style: 'citypop',
    mood: 'Soft and sweet: swung city pop with electric piano, a rainy-day love song.',
    verse: [3, 2, 1, 0], pre: [1, 4, 2, 5], chorus: [1, 4, 0, 5], bridge: [3, 4, 2, 5],
    hookV: [[0.5, 4, 0.5], [1, 5, 0.5], [1.5, 7, 1], [2.5, 5, 0.5], [3, 4, 1], [4.5, 2, 0.5], [5, 4, 0.5], [5.5, 5, 0.5], [6, 4, 2], [8.5, 4, 0.5], [9, 5, 0.5], [9.5, 7, 1], [10.5, 9, 0.5], [11, 8, 1], [12.5, 7, 0.5], [13, 5, 0.5], [13.5, 4, 0.5], [14, 5, 2]],
    hookP: [[0, 8, 1], [1, 7, 1], [2, 5, 1], [3, 4, 1], [4, 5, 2], [6, 4, 1], [7, 2, 1], [8, 4, 1], [9, 5, 1], [10, 7, 1], [11, 8, 1], [12, 9, 4]],
    hookC: [[0, 9, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 9, 1.5], [3.5, 7, 0.5], [4, 8, 1], [5, 7, 1], [6, 5, 2], [8, 7, 1], [9, 8, 0.5], [9.5, 9, 0.5], [10, 11, 1.5], [11.5, 9, 0.5], [12, 10, 1], [13, 9, 1], [14, 8, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
    chops: 'pa pa pa ra pa pa',
    lyrics: {
      verse: [
        ['pa su te ru no a me ga ma chi wo so me te ku', 'Pastel rain is painting the town'],
        ['ka sa mo sa sa zu ni ki mi wo sa ga shi te ru', 'I\'m looking for you without an umbrella'],
        ['mi zu ta ma ri ni u tsu ru ne o n ga yu re', 'Neon wobbles in the puddles'],
        ['ni ji i ro no shi zu ku ga ho ho wo ka za ru', 'rainbow drops on my cheeks'],
      ],
      pre: [['a me a ga ri no so ra ni ka ke ru ni ji', 'In the sky after the rain, a rainbow']],
      chorus: [
        ['pa su te ru re i n fu ri so so i de ki mi ni', 'Pastel rain, keep falling, down to you'],
        ['nu re ta ka mi mo ki ni shi na i ze n bu su ki', 'I don\'t care about my wet hair, I love all of it'],
      ],
    },
  },
  harajuku: {
    title: 'Harajuku Heartbeat', artist: 'SNOWDROP', bpm: 176, root: 63, scale: MAJOR, unlock: () => !!idol.flags.joined && fameLevel() >= 5, stars: 3, style: 'denpa',
    mood: 'Fast, cute and loud chiptune: the crowd shouts every word.',
    verse: [0, 3, 0, 4], pre: [5, 4, 3, 4], chorus: [3, 4, 5, 0], bridge: [5, 3, 4, 4],
    hookV: [[0, 4, 0.5], [0.5, 4, 0.5], [1, 4, 0.5], [1.5, 5, 0.5], [2, 7, 0.5], [2.5, 5, 0.5], [3, 4, 1], [4, 2, 0.5], [4.5, 2, 0.5], [5, 2, 0.5], [5.5, 4, 0.5], [6, 5, 1], [7, 4, 1], [8, 4, 0.5], [8.5, 5, 0.5], [9, 7, 0.5], [9.5, 9, 0.5], [10, 8, 0.5], [10.5, 7, 0.5], [11, 5, 1], [12, 7, 0.5], [12.5, 5, 0.5], [13, 4, 0.5], [13.5, 2, 0.5], [14, 4, 2]],
    hookP: [[0, 4, 0.5], [0.5, 4, 0.5], [1, 5, 0.5], [1.5, 5, 0.5], [2, 6, 0.5], [2.5, 6, 0.5], [3, 7, 1], [4, 7, 0.5], [4.5, 7, 0.5], [5, 8, 0.5], [5.5, 8, 0.5], [6, 9, 0.5], [6.5, 9, 0.5], [7, 10, 1], [8, 11, 2], [10, 10, 2], [12, 11, 4]],
    hookC: [[0, 11, 0.5], [0.5, 11, 0.5], [1, 12, 0.5], [1.5, 11, 0.5], [2, 9, 0.5], [2.5, 7, 0.5], [3, 9, 1], [4, 11, 0.5], [4.5, 11, 0.5], [5, 12, 0.5], [5.5, 14, 0.5], [6, 12, 2], [8, 11, 0.5], [8.5, 12, 0.5], [9, 11, 0.5], [9.5, 9, 0.5], [10, 7, 1], [11, 9, 1], [12, 11, 1], [13, 12, 1], [14, 11, 2]],
    form: ['chorus', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    chops: 'do ki do ki ha i ha i',
    lyrics: {
      verse: [
        ['ha ra ju ku no ka do de to ki me ki ga to ma ra na i', 'On a Harajuku corner my heart won\'t stop racing'],
        ['ku re e pu hi to ku chi ka ga mi no ma e de wi n ku', 'One bite of crepe, a wink in the mirror'],
        ['ka wa i i t te i wa re ta ku te ri bo n wo mu su n da', 'I tied a ribbon, wanting to hear "so cute"'],
        ['de mo ho n to wa ne tsu yo ku na ri ta i n da ki mi no ta me', 'but really, I want to be strong, for you'],
      ],
      pre: [['do ki do ki do ki do ki ha a to ga sa ke n de', 'Doki doki doki doki, my heart is shouting']],
      chorus: [
        ['ha ra ju ku ha a to bi i to ki mi to o do ri ta i', 'Harajuku Heartbeat, I want to dance with you'],
        ['mo t to ha ya ku mo t to ta ka ku so ra ma de to bo', 'faster, higher, let\'s fly all the way to the sky'],
      ],
      bridge: [['ka wa i i da ke ja na i n da yo', 'I\'m not just cute, you know']],
    },
  },
  midnight: {
    title: 'Midnight Train Home', artist: 'Miku', bpm: 86, root: 60, scale: MAJOR, unlock: () => !!idol.flags.joined && fameLevel() >= 6, stars: 2, style: 'lofi',
    mood: 'Lo-fi and late: the last train after a long night, the city going by.',
    verse: [5, 1, 4, 0], pre: [3, 4, 3, 4], chorus: [0, 2, 3, 4], bridge: [5, 3, 1, 4],
    hookV: [[0, 2, 1], [1, 4, 1], [2, 5, 1.5], [3.5, 4, 0.5], [4, 2, 2], [6, 0, 1], [7, 2, 1], [8, 4, 1], [9, 5, 1], [10, 7, 1.5], [11.5, 5, 0.5], [12, 4, 4]],
    hookP: [[0, 5, 1.5], [1.5, 4, 0.5], [2, 5, 1], [3, 7, 1], [4, 7, 3], [8, 8, 1.5], [9.5, 7, 0.5], [10, 5, 1], [11, 4, 1], [12, 4, 4]],
    hookC: [[0, 7, 1.5], [1.5, 9, 0.5], [2, 7, 1], [3, 5, 1], [4, 4, 1.5], [5.5, 5, 0.5], [6, 7, 2], [8, 5, 1.5], [9.5, 7, 0.5], [10, 9, 1], [11, 8, 1], [12, 7, 4]],
    form: ['intro', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    chops: 'u u a a',
    lyrics: {
      verse: [
        ['sa i shu u de n sha no ma do ka ra', 'From the window of the last train'],
        ['ma chi no hi ka ri ga na ga re te ku', 'the city\'s lights flow past'],
        ['tsu ka re ta ka o wo ka ku shi te', 'I hide my tired face'],
        ['a shi ta mo u ta e ru ka na', 'Will I still be able to sing tomorrow?'],
      ],
      pre: [['o ya su mi to ki yo u ha na shi ka ke ru', 'Goodnight, I whisper to everyone today']],
      chorus: [
        ['mi tsu na i to re i n ho o mu ma de', 'Midnight train, all the way home'],
        ['yu me no tsu zu ki wa a shi ta ni ne', 'the rest of the dream, tomorrow'],
      ],
      bridge: [['ma do ni u tsu ru wa ta shi ni sa sa ya ku', 'I whisper to my reflection in the window']],
    },
  },
  runway: {
    title: 'Starlight Runway', artist: 'SNOWDROP', bpm: 168, root: 64, scale: MAJOR, unlock: () => !!idol.flags.tvBooked || fameLevel() >= 6, stars: 3, style: 'rock',
    mood: 'Their arena anthem: guitars, big drums, impossible not to jump to.',
    verse: [5, 3, 0, 4], pre: [3, 4, 3, 4], chorus: [0, 4, 5, 3], bridge: [5, 4, 3, 4],
    hookV: [[0, 4, 0.5], [0.5, 4, 0.5], [1, 4, 0.5], [1.5, 2, 0.5], [2, 4, 1], [3, 5, 1], [4, 4, 0.5], [4.5, 4, 0.5], [5, 2, 0.5], [5.5, 0, 0.5], [6, 2, 2], [8, 4, 0.5], [8.5, 4, 0.5], [9, 5, 0.5], [9.5, 7, 0.5], [10, 7, 1], [11, 9, 1], [12, 8, 1], [13, 7, 1], [14, 5, 2]],
    hookP: [[0, 7, 1], [1, 7, 1], [2, 8, 1], [3, 9, 1], [4, 9, 1], [5, 9, 1], [6, 10, 1], [7, 11, 1], [8, 11, 2], [10, 12, 2], [12, 11, 4]],
    hookC: [[0, 11, 1.5], [1.5, 12, 0.5], [2, 11, 1], [3, 9, 1], [4, 11, 1.5], [5.5, 9, 0.5], [6, 7, 2], [8, 9, 1], [9, 11, 1], [10, 12, 1.5], [11.5, 11, 0.5], [12, 9, 1], [13, 8, 1], [14, 9, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'chorusUp', 'outro'],
    chops: 'ye ye o o',
    lyrics: {
      verse: [
        ['ka ka to wo na ra shi te ra n we i wo a ru i te ku yo', 'Heels clicking, I walk down the runway'],
        ['fu ra shu no a me no na ka de mo ma bu ta wa to ji na i', 'even in a rain of flashes, I won\'t close my eyes'],
        ['da re ka no ma ne ja na i wa ta shi da ke no su te p pu', 'Not copying anyone: a step that\'s only mine'],
        ['su ta a ra i to ga yo n de ru mo u ha shi re ru yo ne', 'The starlight is calling. I can run now'],
      ],
      pre: [['ka u n to da u n go yo n sa n ni i chi', 'Countdown: five, four, three, two, one']],
      chorus: [
        ['su ta ra i to ra n we i ka ga ya ke mo t to ta ka ku', 'Starlight Runway, shine, higher and higher'],
        ['ze n bu no hi ka ri wo a tsu me te ki mi ni a ge ru yo', 'I\'ll gather every light and give it to you'],
      ],
      bridge: [['na ki mu shi da t ta ki no u no wa ta shi ni sa yo na ra', 'Goodbye to yesterday\'s me, the crybaby']],
    },
  },
  crown: {
    title: 'Crown of Light', artist: 'Miku', bpm: 152, root: 67, scale: MAJOR, unlock: () => false, stars: 4, style: 'epic',
    mood: 'Written for one night only: the Tokyo Dome. Strings, brass, a choir.',
    verse: [5, 3, 0, 4], pre: [1, 2, 3, 4], chorus: [3, 4, 2, 5, 3, 4, 0, 0], bridge: [5, 4, 3, 4],
    hookV: [[0, 4, 1], [1, 5, 0.5], [1.5, 7, 0.5], [2, 5, 1], [3, 4, 1], [4, 2, 1.5], [5.5, 4, 0.5], [6, 5, 2], [8, 7, 1], [9, 8, 0.5], [9.5, 9, 0.5], [10, 8, 1], [11, 7, 1], [12, 5, 1.5], [13.5, 4, 0.5], [14, 5, 2]],
    hookP: [[0, 4, 1], [1, 5, 1], [2, 7, 2], [4, 5, 1], [5, 7, 1], [6, 8, 2], [8, 7, 1], [9, 8, 1], [10, 9, 2], [12, 11, 4]],
    hookC: [[0, 9, 1], [1, 11, 0.5], [1.5, 12, 0.5], [2, 14, 2], [4, 12, 1], [5, 11, 1], [6, 9, 2], [8, 11, 1], [9, 12, 1], [10, 14, 1.5], [11.5, 12, 0.5], [12, 11, 1], [13, 12, 1], [14, 14, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    chops: 'o o a a',
    lyrics: {
      verse: [
        ['na n do mo yu ki ni u mo re te mo ma ta ta tsu', 'However many times I\'m buried in the snow, I stand again'],
        ['ko go e ta ho shi ga mi chi wo te ra shi ta no yo', 'A frozen star lit up the way for me'],
        ['ka n se i ga ka ze no yo u ni fu i te ku ru', 'The cheers come blowing in like the wind'],
        ['go ma n ni n no hi ka ri ga ka ga ya i te ru', 'Fifty thousand lights, shining'],
      ],
      pre: [['ko no shu n ka n no ta me ni u ta t te ki ta', 'It was for this moment that I sang']],
      chorus: [
        ['hi ka ri no ka n mu ri ka bu t te u ta u yo', 'Wearing a crown of light, I\'ll sing'],
        ['na mi da no sa ki ni sa i ta mi ra i wo shi n ji te', 'I believe in the future that bloomed past the tears'],
        ['mo u ni ge na i yo ko ko ga wa ta shi no ba sho', 'I won\'t run any more: this is where I belong'],
        ['mi n na no ko e ga ha ne ni na ru', 'Everyone\'s voices become my wings'],
      ],
      bridge: [['o bo e te ru a no yu ki no hi wo mo u ma ke na i', 'Remember that snowy day? I won\'t lose again']],
    },
  },
  // Teto's: minor, heavy, a drill of sixteenths. Heard on screens, and when she rises.
  crimson: {
    title: 'Crimson Drill Parade', artist: 'Teto', bpm: 150, root: 60, scale: MINOR, teto: true, unlock: () => false, stars: 4, style: 'drill',
    mood: 'Her debut. It went straight to number one.',
    verse: [0, 5, 3, 4], pre: [3, 4, 3, 4], chorus: [5, 6, 0, 4], bridge: [3, 4, 5, 4],
    hookV: [[0, 0, 0.5], [0.5, 0, 0.5], [1, 3, 0.5], [1.5, 0, 0.5], [2, 4, 1], [3, 3, 1], [4, 0, 0.5], [4.5, 0, 0.5], [5, 3, 0.5], [5.5, 4, 0.5], [6, 6, 2], [8, 7, 1], [9, 6, 0.5], [9.5, 4, 0.5], [10, 3, 1], [11, 4, 1], [12, 0, 2], [14, 2, 2]],
    hookP: [[0, 4, 1], [1, 4, 1], [2, 5, 1], [3, 6, 1], [4, 7, 4], [8, 6, 1], [9, 7, 1], [10, 8, 2], [12, 7, 4]],
    hookC: [[0, 7, 0.5], [0.5, 7, 0.5], [1, 6, 0.5], [1.5, 7, 0.5], [2, 9, 1], [3, 7, 1], [4, 8, 1.5], [5.5, 7, 0.5], [6, 6, 2], [8, 7, 0.5], [8.5, 9, 0.5], [9, 10, 1], [10, 9, 1], [11, 7, 1], [12, 6, 1], [13, 4, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'],
    chops: 'gu ru gu ru',
    lyrics: {
      verse: [
        ['ku re na i no do ri ru ga ma wa ru yo gu ru gu ru to', 'My crimson drills are spinning, round and round'],
        ['hi za ma zu i te mi te na sa i wa ta shi ga jo o', 'Kneel down and watch. I\'m the queen'],
      ],
      chorus: [
        ['ku ri mu zo n do ri ru pa re e do ha de ni ka ze', 'Crimson Drill Parade, blow it all away'],
        ['ma ke ru no wa a na ta yo ki ma t te ru n da ka ra', 'The one who loses is you. That\'s already decided'],
      ],
    },
  },
};

// Bars per section and how hard it hits (the styles decide what that means).
const SECTION = {
  intro: { bars: 4, prog: 'chorus', energy: 0.35, words: null, chops: true },
  verse: { bars: 8, prog: 'verse', energy: 0.55, hook: 'hookV', words: 'verse' },
  pre: { bars: 4, prog: 'pre', energy: 0.7, hook: 'hookP', words: 'pre', riser: true },
  chorus: { bars: 8, prog: 'chorus', energy: 1, hook: 'hookC', words: 'chorus', harmony: true, crash: true },
  chorusUp: { bars: 8, prog: 'chorus', energy: 1, hook: 'hookC', words: 'chorus', harmony: true, crash: true, up: 1, choir: true },
  inter: { bars: 4, prog: 'chorus', energy: 0.8, words: null, chops: true },
  bridge: { bars: 4, prog: 'bridge', energy: 0.4, hook: 'hookP', words: 'bridge', riser: true, choir: true },
  outro: { bars: 4, prog: 'chorus', energy: 0.3, words: null, chops: true, end: true },
};

/* ---------- Fitting the words to the tune ---------- */
// The syllables of a line, with small tsu (a lone consonant: "p", "t") folded into a catch
// before the next syllable.
function lyricTokens(text) {
  const out = [];
  let catchNext = false;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    if (raw !== 'n' && raw !== '-' && !/[aiueo]$/.test(raw)) { catchNext = true; continue; }
    out.push({ text: raw, gem: catchNext });
    catchNext = false;
  }
  return out;
}

// Stretches or squeezes a hook to have exactly `count` notes: long notes split into two,
// short ones merge into the note before, so every syllable gets a note of its own.
function fitHook(notes, count) {
  const n = notes.map((x) => x.slice());
  let guard = 0;
  while (n.length < count && guard++ < 64) {
    let best = -1;
    for (let i = 0; i < n.length; i++) if (n[i][2] >= 0.5 && (best < 0 || n[i][2] > n[best][2])) best = i;
    if (best < 0) for (let i = 0; i < n.length; i++) if (best < 0 || n[i][2] > n[best][2]) best = i;
    const [b, p, l] = n[best], h = l / 2;
    n.splice(best, 1, [b, p, h], [b + h, p, h]);
  }
  while (n.length > count && n.length > 1) {
    let best = 1;
    for (let i = 1; i < n.length; i++) if (n[i][2] < n[best][2]) best = i;
    n[best - 1][2] += n[best][2];
    n.splice(best, 1);
  }
  return n;
}

// How long each consonant takes, said ahead of the beat (seconds).
const CONS_LEAD = { s: 0.085, sh: 0.095, z: 0.06, j: 0.065, ts: 0.07, ch: 0.07, h: 0.055, f: 0.06, k: 0.05, g: 0.035, t: 0.042, d: 0.03, p: 0.042, b: 0.03, m: 0.065, n: 0.055, r: 0.022, y: 0.05, w: 0.05 };
const consOf = (tok) => (!tok || tok === '-' || tok === 'n' ? '' : tok.slice(0, -1));

/* ---------- Laying a song out in time ---------- */
const songLayouts = {};
function layoutSong(id) {
  if (songLayouts[id]) return songLayouts[id];
  const S = SONGS[id];
  const style = SONG_STYLES[S.style] || SONG_STYLES.idol;
  const events = [], chart = [], lines = [], sections = [];
  let bar = 0, keyShift = 0;
  const seen = {};
  const note = (step, oct = 0) => {
    const n = S.scale.length, o = Math.floor(step / n), s = ((step % n) + n) % n;
    return S.root + keyShift + S.scale[s] + 12 * (o + oct);
  };
  const wordsFor = (kind) => {
    const list = (S.lyrics && S.lyrics[kind]) || (kind === 'bridge' && S.lyrics && S.lyrics.pre) || null;
    if (!list || !list.length) return null;
    const k = seen[kind] = seen[kind] || 0;
    seen[kind]++;
    return list[k % list.length];
  };
  const sing = (hook, words, harmony) => {
    const toks = words ? lyricTokens(words[0]) : [];
    const notes = toks.length ? fitHook(hook, toks.length) : hook;
    const line = { beat: notes[0][0], end: 0, tokens: [], en: words ? words[1] : '' };
    notes.forEach(([b, pitch, len], i) => {
      const tk = toks[i] || { text: 'la', gem: false };
      events.push([b, 'lead', pitch, len, tk.text, tk.gem]);
      if (harmony) events.push([b, 'harm', pitch + (harmony === 'third' ? 0 : 0), len, tk.text, tk.gem, harmony]);
      chart.push({ beat: b, pitch, len });
      if (tk.text !== '-') line.tokens.push({ beat: b, text: tk.text });
      line.end = b + len;
    });
    if (words) lines.push(line);
  };
  const group = S.artist !== 'Miku' && S.artist !== 'Teto';
  for (const name of S.form) {
    const sec = SECTION[name];
    if (sec.up) keyShift = 2;
    const prog = S[sec.prog];
    const at0 = bar * 4;
    sections.push({ name, beat: at0, end: (bar + sec.bars) * 4 });
    for (let b = 0; b < sec.bars; b++) {
      const at = (bar + b) * 4, deg = prog[b % prog.length];
      const chord = [0, 2, 4].map((k) => note(deg + k, -1));
      style.bar({ E: (beat, kind, ...a) => events.push([at + beat, kind, ...a]), at, b, bars: sec.bars, name, sec, deg, chord, seventh: note(deg + 6, -1), note, S, last: b === sec.bars - 1 });
    }
    // The sung line: the hook for this section, a line of words each pass.
    if (sec.hook && S[sec.hook]) {
      const hook = S[sec.hook];
      for (let rep = 0; rep < sec.bars / 4; rep++) {
        const notes = hook.map(([b, step, len]) => {
          const s2 = rep === 1 && b >= 12 ? step + (b >= 14 ? 2 : 1) : step;
          return [at0 + rep * 16 + b, note(s2), len, s2];
        });
        // Harmony: a third above on the group's choruses (and on Miku's last chorus, the
        // girls joining in), a third below in the bridge.
        const harm = sec.harmony && (group || sec.up) ? 'up' : null;
        const words = wordsFor(sec.words);
        const before = events.length;
        sing(notes.map(([b, p, l]) => [b, p, l]), words, harm);
        if (harm) {
          // Re-pitch the harmony notes a scale third above their melody note.
          for (let i = before; i < events.length; i++) {
            const e = events[i];
            if (e[1] !== 'harm') continue;
            const idx = S.scale.findIndex((x) => ((e[2] - S.root - keyShift) % 12 + 12) % 12 === x);
            e[2] += idx >= 0 ? (S.scale[(idx + 2) % 7] - S.scale[idx] + 12) % 12 : 4;
          }
        }
      }
    }
    // Chopped vocals: the riff in the intro, the break and the outro.
    if (sec.chops && S.chops) {
      const toks = S.chops.split(' ');
      for (let b = 0; b < sec.bars; b++) {
        if (name === 'intro' && b < 2) continue;
        const deg = prog[b % prog.length];
        toks.forEach((tk, i) => {
          if (i >= 8) return;
          const pos = [0, 0.5, 1.5, 2, 2.5, 3, 3.5, 3.75][i];
          events.push([(bar + b) * 4 + pos, 'chop', note(deg + [0, 2, 4, 7, 4, 2, 4, 7][i] + 7), 0.4, tk]);
        });
      }
    }
    // A choir under the big moments.
    if (sec.choir) for (let b = 0; b < sec.bars; b += 2) { const deg = prog[b % prog.length]; events.push([(bar + b) * 4, 'choir', [0, 2, 4].map((k) => note(deg + k)), 8, name === 'bridge' ? 'u' : 'a']); }
    if (sec.riser) events.push([(bar + sec.bars - 2) * 4, 'riser', 8]);
    if (sec.crash) events.push([bar * 4, 'crash']);
    if (!sec.hook) for (let b = 0; b < sec.bars; b++) for (const q of [0, 2]) chart.push({ beat: (bar + b) * 4 + q, pitch: null, len: 0.5, drum: true });
    bar += sec.bars;
  }
  events.push([bar * 4, 'crash']);
  // Her singing range: the whole vocal line moved by octaves so it sits where a voice sings
  // best, about A4 for Miku, a little lower for Teto.
  const sung = events.filter((e) => e[1] === 'lead').map((e) => e[2]).sort((a, b) => a - b);
  const median = sung[Math.floor(sung.length / 2)] || 69;
  const shift = 12 * Math.round(((S.teto ? 66 : 70) - median) / 12);
  for (const e of events) if (e[1] === 'lead' || e[1] === 'harm' || e[1] === 'chop') e[2] += shift;
  events.sort((a, b) => a[0] - b[0]);
  // Each sung note ends a moment early when the next one has a consonant to say first.
  const leads = events.filter((e) => e[1] === 'lead');
  const beatSec = 60 / S.bpm;
  for (let i = 0; i < leads.length - 1; i++) {
    const e = leads[i], nx = leads[i + 1];
    const gap = (nx[0] - (e[0] + e[3])) * beatSec;
    const lead = (CONS_LEAD[consOf(nx[4])] || 0) + (nx[5] ? 0.06 : 0);
    e[6] = Math.max(0, lead - Math.max(0, gap));
    e[7] = gap < 0.06 ? nx[2] : null; // the next pitch, for the glide into it
  }
  chart.sort((a, b) => a.beat - b.beat);
  const layout = { id, events, chart, lines, sections, beats: bar * 4 + 2, seconds: (bar * 4 + 2) * 60 / S.bpm, bpm: S.bpm };
  songLayouts[id] = layout;
  return layout;
}

/* ---------- The styles: drums, bass, chords and colour for each kind of song ---------- */
// Each gets a bar at a time and pushes events: E(beatInBar, kind, ...args).
const SONG_STYLES = {
  // Classic idol pop: four on the floor, octave bass, supersaws and bells on the chorus.
  idol: {
    bar({ E, sec, chord, deg, note, last }) {
      const e = sec.energy;
      for (let q = 0; q < 4; q++) {
        if (e >= 0.5 || q % 2 === 0) E(q, 'kick');
        if (e >= 0.5 && (q === 1 || q === 3)) E(q, 'clap');
        E(q + 0.5, 'hat', e >= 0.9 ? 0.9 : 0.5);
        if (e >= 0.9) { E(q + 0.25, 'hat', 0.3); E(q + 0.75, 'hat', 0.3); }
      }
      for (let i = 0; i < 8; i++) E(i * 0.5, 'bass', note(deg, -2) + (e >= 0.5 && i % 2 ? 12 : 0), 0.45, 'saw');
      if (e >= 0.9) for (let i = 0; i < 4; i++) E(i + 0.5, 'supersaw', chord, 0.45);
      else if (e >= 0.5) for (const i of [0, 1.5, 3]) E(i, 'piano', chord.map((c) => c + 12), 1);
      else E(0, 'pad', chord, 4);
      if (e >= 0.9 || sec.chops) for (let s = 0; s < 8; s++) E(s * 0.5, 'bell', chord[s % 3] + 24 + (s >= 3 ? 7 : 0));
      if (last && e >= 0.6) for (let s = 0; s < 4; s++) E(3 + s * 0.25, 'snare', s / 4);
    },
  },
  // Summer ska-pop: guitar chops on every offbeat, a bouncing slap bass, horn stabs, marimba.
  ska: {
    bar({ E, sec, chord, deg, note, b, last }) {
      const e = sec.energy;
      E(0, 'kick'); E(2, 'kick'); if (e >= 0.5) E(2.5, 'kick');
      E(1, 'rim'); E(3, 'rim'); if (e >= 0.9) { E(1, 'clap'); E(3, 'clap'); }
      for (let s = 0; s < 8; s++) E(s * 0.5, 'shaker', s % 2 ? 0.8 : 0.4);
      const walk = [0, 4, 7, 4];
      for (let q = 0; q < 4; q++) E(q, 'bass', note(deg, -2) + [0, 7, 12, 7][q] * (e >= 0.5 ? 1 : 0), 0.7, 'slap');
      void walk;
      for (let q = 0; q < 4; q++) E(q + 0.5, 'pluck', chord.map((c) => c + 12), 0.2);
      if (e >= 0.9 && b % 2 === 0) { E(0, 'brass', chord.map((c) => c + 12), 0.5); E(1.5, 'brass', chord.map((c) => c + 12), 0.5); }
      if (e >= 0.9 || sec.chops) for (let s = 0; s < 8; s++) E(s * 0.5, 'marimba', chord[[0, 1, 2, 1][s % 4]] + 24 + (s >= 4 ? 7 : 0));
      if (last && e >= 0.6) { E(3, 'tom', 55); E(3.25, 'tom', 50); E(3.5, 'tom', 45); }
    },
  },
  // A piano ballad: arpeggiated piano, a round bass, half-time drums, strings in the chorus.
  ballad: {
    bar({ E, sec, chord, deg, note, b }) {
      const e = sec.energy;
      const arp = [chord[0] - 12, chord[2] - 12, chord[0], chord[1], chord[2], chord[1], chord[0], chord[2] - 12];
      arp.forEach((n, i) => E(i * 0.5, 'piano', [n + 12], 1.2, 0.8));
      E(0, 'bass', note(deg, -2), 3.5, 'round');
      if (e >= 0.5) { E(0, 'kick'); E(2.5, 'kick', 0.5); E(2, e >= 0.9 ? 'snare' : 'rim', 0.6); for (let q = 0; q < 4; q++) E(q, 'hat', 0.35); }
      if (e >= 0.9) { E(0, 'strings', chord.map((c) => c + 12), 4); if (b % 2 === 0) E(0, 'bell', chord[2] + 24); }
      if (sec.energy < 0.4 && b % 2 === 0) E(0, 'strings', chord, 8);
    },
  },
  // Synthwave: four on the floor, a huge gated snare, driving eighths of bass, a sixteenth arp.
  synthwave: {
    bar({ E, sec, chord, deg, note, last }) {
      const e = sec.energy;
      for (let q = 0; q < 4; q++) { if (e >= 0.5 || q === 0) E(q, 'kick'); E(q + 0.5, 'hat', 0.5); }
      if (e >= 0.5) { E(1, 'gate'); E(3, 'gate'); }
      for (let i = 0; i < 8; i++) E(i * 0.5, 'bass', note(deg, -2), 0.45, 'pulse');
      const arp = [0, 1, 2, 1, 2, 3, 2, 1];
      for (let s = 0; s < 16; s++) E(s * 0.25, 'arp', [chord[0], chord[1], chord[2], chord[0] + 12][arp[s % 8]] + 12, 0.22, s % 4 === 0 ? 1 : 0.6);
      E(0, 'pad', chord, 4);
      if (e >= 0.9) for (let i = 0; i < 4; i++) E(i, 'supersaw', chord.map((c) => c + 12), 0.9);
      if (last && e >= 0.6) for (let s = 0; s < 4; s++) E(2 + s * 0.5, 'tom', 60 - s * 4);
    },
  },
  // City pop: swung, an electric piano with sevenths, syncopated slap bass, rim and shaker.
  citypop: {
    swing: 0.17,
    bar({ E, sec, chord, deg, note, seventh }) {
      const e = sec.energy;
      E(0, 'kick'); E(1.5, 'kick', 0.6); E(2.5, 'kick', 0.7);
      E(1, e >= 0.9 ? 'snare' : 'rim', 0.5); E(3, e >= 0.9 ? 'snare' : 'rim', 0.5);
      for (let s = 0; s < 8; s++) E(s * 0.5, 'hat', s % 2 ? 0.55 : 0.3);
      const r = note(deg, -2);
      for (const [p, n] of [[0, r], [0.75, r + 12], [1.5, r + 7], [2, r], [2.75, r + 10], [3.5, r + 12]]) E(p, 'bass', n, 0.35, 'slap');
      const ch = [...chord.map((c) => c + 12), seventh + 12];
      E(0.5, 'epiano', ch, 1.2); E(2.5, 'epiano', ch, 1);
      if (e >= 0.9) E(0, 'strings', chord.map((c) => c + 12), 4);
      if (sec.chops || e >= 0.9) E(3.5, 'bell', chord[2] + 24);
    },
  },
  // Denpa chiptune: frantic kicks, square-wave everything, sixteenth arpeggios, claps.
  denpa: {
    bar({ E, sec, chord, deg, note, last }) {
      const e = sec.energy;
      for (let q = 0; q < 4; q++) { E(q, 'kick'); for (const h of [0.25, 0.5, 0.75]) E(q + h, 'hat', h === 0.5 ? 0.7 : 0.35); }
      E(3.5, 'kick', 0.7);
      if (e >= 0.5) { E(1, 'snare', 0.7); E(3, 'snare', 0.7); E(1, 'clap'); E(3, 'clap'); }
      for (let i = 0; i < 8; i++) E(i * 0.5, 'bass', note(deg, -2) + (i % 2 ? 12 : 0), 0.4, 'square');
      for (let s = 0; s < 16; s++) E(s * 0.25, 'chip', [chord[0], chord[1], chord[2], chord[1]][s % 4] + 24, 0.2);
      if (e >= 0.9) for (let i = 0; i < 4; i++) E(i + 0.5, 'supersaw', chord.map((c) => c + 12), 0.4);
      if (last) for (let s = 0; s < 8; s++) E(2 + s * 0.25, 'snare', s / 8);
    },
  },
  // Lo-fi: lazy half-time boom-bap, brushes, a deep sine bass, a dusty electric piano.
  lofi: {
    swing: 0.2,
    bar({ E, sec, chord, deg, note, seventh, b }) {
      const e = sec.energy;
      E(0, 'kick'); E(1.75, 'kick', 0.6); if (e >= 0.5) E(2.5, 'kick', 0.5);
      E(2, 'brush', 0.8);
      for (let s = 0; s < 8; s++) E(s * 0.5, 'hat', s % 2 ? 0.35 : 0.2);
      E(0, 'bass', note(deg, -2), 3.8, 'sub');
      const ch = [chord[0] + 12, chord[1] + 12, chord[2] + 12, seventh + 12];
      E(0, 'epiano', ch, 3); E(2.75, 'epiano', [ch[1], ch[3]], 1);
      if (e >= 0.9 && b % 2 === 0) E(0, 'strings', chord.map((c) => c + 12), 8);
      E(0, 'vinyl', 4);
    },
  },
  // Arena rock: chugging power chords, driving bass, big snare, tom fills, crashes.
  rock: {
    bar({ E, sec, chord, deg, note, b, last }) {
      const e = sec.energy;
      E(0, 'kick'); E(1.5, 'kick', 0.7); E(2, 'kick'); if (e >= 0.9) E(3.5, 'kick', 0.7);
      E(1, 'snare', 1); E(3, 'snare', 1);
      for (let s = 0; s < 8; s++) E(s * 0.5, e >= 0.9 ? 'ride' : 'hat', 0.6);
      const r = note(deg, -2);
      for (let i = 0; i < 8; i++) E(i * 0.5, 'bass', r, 0.45, 'dist');
      if (e >= 0.9) { E(0, 'power', r + 12, 2); E(2, 'power', r + 12, 2); if (b % 2 === 0) E(0, 'crash'); }
      else if (e >= 0.5) for (let i = 0; i < 8; i++) E(i * 0.5, 'power', r + 12, 0.25);
      else E(0, 'power', r + 12, 4);
      if (last && e >= 0.6) for (let s = 0; s < 4; s++) E(3 + s * 0.25, 'tom', 58 - s * 5);
    },
  },
  // Epic: a strings ostinato, brass on the downbeats, taiko-style drums, bells and choir.
  epic: {
    bar({ E, sec, chord, deg, note, b, last }) {
      const e = sec.energy;
      for (let q = 0; q < 4; q++) if (e >= 0.5 || q === 0) E(q, 'kick');
      if (e >= 0.5) { E(1, 'snare', 0.8); E(3, 'snare', 0.8); E(1, 'clap'); E(3, 'clap'); }
      for (let s = 0; s < 8; s++) E(s * 0.5, 'hat', 0.4);
      if (sec.name === 'pre' || e < 0.5) for (const p of [0, 0.75, 1.5, 2, 3]) E(p, 'tom', 42);
      for (let i = 0; i < 8; i++) E(i * 0.5, 'bass', note(deg, -2) + (i % 2 ? 12 : 0), 0.45, 'saw');
      for (let s = 0; s < 8; s++) E(s * 0.5, 'stacc', [chord[0], chord[2], chord[1], chord[2]][s % 4] + 12, 0.3);
      if (e >= 0.9) { E(0, 'brass', chord.map((c) => c + 12), 1.5); E(2.5, 'brass', chord.map((c) => c + 12), 1); E(0, 'strings', chord.map((c) => c + 24), 4); for (let s = 0; s < 8; s++) E(s * 0.5, 'bell', chord[s % 3] + 24 + (s >= 4 ? 7 : 0)); }
      else E(0, 'strings', chord.map((c) => c + 12), 4);
      if (b % 4 === 0 && e >= 0.9) E(0, 'crash');
      if (last && e >= 0.6) for (let s = 0; s < 8; s++) E(2 + s * 0.25, 'snare', s / 8);
    },
  },
  // Teto's: trap drums with rolling hats, a sliding 808, dark pads, distorted stabs.
  drill: {
    bar({ E, sec, chord, deg, note, b }) {
      const e = sec.energy;
      E(0, 'kick'); E(0.75, 'kick', 0.7); E(2.5, 'kick', 0.8);
      E(2, 'snare', 1); E(2, 'clap');
      for (let s = 0; s < (b % 2 ? 16 : 8); s++) E(s * (b % 2 ? 0.25 : 0.5), 'hat', 0.5);
      if (b % 2) for (let s = 0; s < 6; s++) E(3.25 + s / 12, 'hat', 0.4);
      E(0, 'bass', note(deg, -2), 2.4, '808'); E(2.5, 'bass', note(deg, -2) + (b % 2 ? 3 : 0), 1.4, '808');
      E(0, 'pad', chord, 4);
      if (e >= 0.9) for (const p of [0, 0.75, 1.5]) E(p, 'power', note(deg, -1), 0.3);
      if (e >= 0.5) for (let s = 0; s < 4; s++) E(s + 0.5, 'bell', chord[[0, 2, 1, 2][s]] + 24);
    },
  },
};

/* ---------- Playing a song ---------- */
// Schedules a song's notes a little ahead on the audio clock. Returns a handle with the start
// time (audio clock), the song's time now, and stop().
function playSong(id, { level = 0.8 } = {}) {
  Sfx.init();
  const ctx = Sfx.ctx, L = layoutSong(id), S = SONGS[id];
  const beat = 60 / S.bpm, style = SONG_STYLES[S.style] || SONG_STYLES.idol;
  const out = ctx.createGain();
  out.gain.value = level;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
  out.connect(comp).connect(Sfx.master);
  // The band, with a dip where the voice lives so the words come through.
  const band = ctx.createGain(); band.gain.value = 0.82;
  const dip = ctx.createBiquadFilter(); dip.type = 'peaking'; dip.frequency.value = 2400; dip.Q.value = 0.9; dip.gain.value = -5;
  band.connect(dip).connect(out);
  const send = ctx.createGain(); send.gain.value = 0.16; dip.connect(send).connect(Sfx.verb);
  // The voice: compressed, a lift in its presence, a plate-ish reverb and a slapback echo.
  const voiceBus = ctx.createGain(); voiceBus.gain.value = 1;
  const vcomp = ctx.createDynamicsCompressor(); vcomp.threshold.value = -20; vcomp.ratio.value = 4; vcomp.attack.value = 0.004; vcomp.release.value = 0.12;
  const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.Q.value = 1; pres.gain.value = 4;
  const vout = ctx.createGain(); vout.gain.value = 1.5;
  voiceBus.connect(vcomp).connect(pres).connect(vout).connect(out);
  const vsend = ctx.createGain(); vsend.gain.value = 0.28; vout.connect(vsend).connect(Sfx.verb);
  const echo = ctx.createDelay(1); echo.delayTime.value = beat * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.25;
  const eg = ctx.createGain(); eg.gain.value = 0.14;
  const ef = ctx.createBiquadFilter(); ef.type = 'highpass'; ef.frequency.value = 500;
  vout.connect(ef).connect(echo); echo.connect(fb).connect(echo); echo.connect(eg).connect(out);
  const start = ctx.currentTime + 0.35;
  let next = 0, stopped = false;
  const state = { lead: { vowel: 'a', end: 0, midi: 0 }, harm: { vowel: 'a', end: 0, midi: 0 }, chop: { vowel: 'a', end: 0, midi: 0 } };
  const swing = style.swing || 0;
  const handle = {
    id, start, beat, layout: L, out,
    // What can be heard right now: the audio clock less the time the sound takes to reach
    // the speakers, so notes and key presses line up with the music you hear.
    time: () => heardTime(ctx) - start,
    stop(fade = 0.6) { stopped = true; clearInterval(timer); out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); setTimeout(() => out.disconnect(), fade * 1000 + 400); },
    done: () => ctx.currentTime - start > L.seconds,
  };
  const pump = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + 0.7;
    while (next < L.events.length && start + L.events[next][0] * beat < horizon) {
      const ev = L.events[next++];
      const [b, kind] = ev;
      const off = swing && Math.abs((b % 1) - 0.5) < 0.01 && kind !== 'lead' && kind !== 'harm' ? swing * beat : 0;
      const t = start + b * beat + off;
      if (kind === 'lead' || kind === 'harm' || kind === 'chop') {
        const [, , midi, len, tok, gem, harm] = ev;
        vocalNote(ctx, voiceBus, t, midi, len * beat, tok, state[kind], S, { kind, gem, cut: kind === 'lead' ? ev[6] || 0 : 0, harm: kind === 'harm' ? harm : null });
      } else if (kind === 'choir') choirChord(ctx, voiceBus, t, ev[2], ev[3] * beat, ev[4], S);
      else songVoice(ctx, band, kind, t, ev[2], ev[3], beat, S, ev[4]);
    }
  };
  warmVoice(ctx, L, S);
  const timer = setInterval(pump, 120);
  pump();
  return handle;
}

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ---------- The voice ---------- */
// Formants of a young woman's singing voice: [frequency, bandwidth, level]. Japanese u is
// unrounded, so its second formant sits higher than an English "oo".
const VOX = {
  a: [[830, 95, 1], [1320, 105, 0.6], [2900, 150, 0.32], [3750, 230, 0.15]],
  i: [[310, 55, 1], [2600, 115, 0.42], [3300, 150, 0.34], [4150, 230, 0.16]],
  u: [[350, 60, 1], [1380, 115, 0.32], [2650, 150, 0.15], [3500, 230, 0.07]],
  e: [[520, 70, 1], [2080, 110, 0.48], [2880, 150, 0.28], [3750, 230, 0.13]],
  o: [[520, 75, 1], [880, 85, 0.62], [2750, 150, 0.17], [3500, 230, 0.08]],
  n: [[270, 50, 1], [1750, 180, 0.05], [2650, 220, 0.04]],
  m: [[260, 50, 1], [1150, 180, 0.04], [2500, 220, 0.03]],
};
// Where the second formant starts after each place in the mouth, for the transitions that
// let you hear which consonant it was.
const LOCUS = { p: 0.72, b: 0.72, m: 0.72, f: 0.8, w: 0.75, t: 1700, d: 1700, s: 1750, z: 1750, ts: 1750, n: 1700, r: 1650, ch: 2300, sh: 2300, j: 2300, y: 2400, k: 1, g: 1, h: 1 };
const voxCache = new Map();
// A single cycle of the voice at this pitch, its harmonics shaped by the formants: built
// once, cached by vowel and pitch.
function voxWave(ctx, formants, f0, key) {
  const k0 = `${key}|${Math.round(f0 / 5)}`;
  let w = voxCache.get(k0);
  if (w) return w;
  if (voxCache.size > 900) voxCache.clear();
  const n = Math.max(4, Math.min(48, Math.floor(6000 / f0)));
  const real = new Float32Array(n + 1), imag = new Float32Array(n + 1);
  let sum = 0;
  for (let k = 1; k <= n; k++) {
    const f = k * f0;
    let a = 0;
    for (const [F, B, A] of formants) {
      // High voices have few harmonics, so the bands are widened to always catch one.
      const bw = Math.max(B, f0 * 0.55), x = (f - F) / (bw / 2);
      a += A / (1 + x * x);
    }
    a = a * Math.pow(k, -0.25) + 0.012 / k;
    imag[k] = a;
    sum += a * a;
  }
  const norm = 0.55 / Math.sqrt(sum);
  for (let k = 1; k <= n; k++) imag[k] *= norm;
  w = ctx.createPeriodicWave(real, imag, { disableNormalization: true });
  voxCache.set(k0, w);
  return w;
}

function formantsFor(vowel, cons, shift, from) {
  const F = (VOX[vowel] || VOX.a).map(([f, b, a]) => [f * shift, b, a]);
  if (!from) return F;
  // Just after the consonant: the jaw still closed (a low first formant), the second formant
  // starting near where that consonant is made.
  const L = LOCUS[cons];
  return F.map(([f, b, a], k) => {
    if (k === 0) return [f * (from === 'stop' ? 0.55 : 0.75), b, a];
    if (k === 1 && L !== undefined && L !== 1) return [L < 10 ? f * L : lerp(f, L * shift, 0.55), b, a];
    return [f, b, a];
  });
}

// One sung syllable: a cycle-perfect voice gliding into its pitch, vibrato blooming on long
// notes, the vowel coming out of the consonant; the consonant itself said just before.
function vocalNote(ctx, out, t, midi, dur, token, state, S, opt = {}) {
  const tok = token || 'la';
  const kind = opt.kind || 'lead';
  let vowel = tok[tok.length - 1], cons = consOf(tok), legato = false;
  if (tok === '-') { vowel = state.vowel; cons = ''; legato = true; }
  else if (tok === 'n') { vowel = 'n'; cons = ''; }
  if (!VOX[vowel]) return;
  const prev = state.vowel;
  state.vowel = vowel === 'n' ? state.vowel : vowel;
  const teto = !!S.teto;
  const shift = (teto ? 0.94 : 1.06) * (kind === 'harm' ? (opt.harm === 'up' ? 1.06 : 1) : 1);
  const level = kind === 'harm' ? 0.2 : kind === 'chop' ? 0.26 : 0.5;
  const f0 = midiHz(midi);
  const len = Math.max(0.07, (kind === 'chop' ? Math.min(dur, 0.16) : dur) - (opt.cut || 0) - (opt.gem ? 0 : 0));
  const cl = kind === 'harm' ? 0 : CONS_LEAD[cons] || 0;
  const joined = state.end > t - 0.09 && state.midi;
  // Pitch: a glide from the last note when it's joined on, a small scoop up when it isn't,
  // a hint of overshoot, and vibrato on anything long.
  const fStart = joined ? midiHz(state.midi) : f0 * 0.955;
  const glide = joined ? 0.06 : 0.07;
  const startAt = t - (cons === 'm' || cons === 'n' || cons === 'y' || cons === 'w' || cons === 'z' || cons === 'j' ? cl : 0);
  const vib = ctx.createOscillator(), vd = ctx.createGain();
  vib.frequency.value = (teto ? 6.4 : 5.6) + Math.random() * 0.4;
  vd.gain.setValueAtTime(0, t);
  vd.gain.setValueAtTime(0, t + Math.min(0.3, len * 0.45));
  vd.gain.linearRampToValueAtTime(len > 0.35 ? (kind === 'lead' ? 38 : 25) : 8, t + len);
  vib.connect(vd);
  const pan = ctx.createStereoPanner(); pan.pan.value = kind === 'harm' ? (Math.random() < 0.5 ? -0.35 : 0.35) : kind === 'chop' ? (Math.random() - 0.5) * 0.8 : 0;
  pan.connect(out);
  const oscs = [];
  const voice = (formants, key, gainSchedule) => {
    const o = ctx.createOscillator();
    o.setPeriodicWave(voxWave(ctx, formants, f0, key));
    o.frequency.setValueAtTime(fStart, startAt);
    o.frequency.setValueAtTime(fStart, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.008, t + glide);
    o.frequency.exponentialRampToValueAtTime(f0, t + glide + 0.05);
    vd.connect(o.detune);
    const g = ctx.createGain();
    gainSchedule(g.gain);
    o.connect(g).connect(pan);
    oscs.push(o);
    return o;
  };
  const end = t + len;
  const rel = kind === 'chop' ? 0.04 : 0.07;
  // The vowel itself.
  const fade = cons === 'y' || cons === 'w' ? 0.07 : cons ? 0.045 : legato || joined ? 0.05 : 0.02;
  voice(formantsFor(vowel, '', shift), `${vowel}${shift}`, (g) => {
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(level, t + fade);
    g.setValueAtTime(level, end - 0.01);
    g.exponentialRampToValueAtTime(0.0001, end + rel);
  });
  // What leads into it: the hum of m or n, the glide of y or w, the closed jaw after a stop,
  // or the last vowel, so one syllable flows into the next.
  let from = null, fromKey = '';
  if (cons === 'm' || cons === 'n') { from = (VOX[cons]).map(([f, b, a]) => [f * shift, b, a]); fromKey = cons; }
  else if (cons === 'y') { from = formantsFor('i', '', shift); fromKey = 'i'; }
  else if (cons === 'w') { from = formantsFor('u', '', shift); fromKey = 'u'; }
  else if (cons) { from = formantsFor(vowel, cons, shift, /^(k|g|t|d|p|b|ch|ts)/.test(cons) ? 'stop' : 'fric'); fromKey = `${vowel}~${cons}`; }
  else if (prev !== vowel && (joined || legato)) { from = formantsFor(prev, '', shift); fromKey = prev; }
  if (from) {
    const nasal = cons === 'm' || cons === 'n';
    const s0 = nasal || cons === 'y' || cons === 'w' || cons === 'z' || cons === 'j' ? startAt : t;
    voice(from, `${fromKey}${shift}`, (g) => {
      g.setValueAtTime(0.0001, s0);
      g.exponentialRampToValueAtTime(level * (nasal ? 0.55 : 0.9), s0 + 0.015);
      g.setValueAtTime(level * (nasal ? 0.55 : 0.9), t);
      g.exponentialRampToValueAtTime(0.0001, t + fade + 0.03);
    });
  }
  // Teto has an edge on her voice: a thread of raw saw under the vowel.
  if (teto && kind === 'lead') {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); vd.connect(o.detune);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level * 0.12, t + 0.03); g.gain.setValueAtTime(level * 0.12, end); g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
    o.connect(f).connect(g).connect(pan); oscs.push(o);
  }
  // Breath: a little air through the upper formants, the Vocaloid sheen.
  if (kind === 'lead') {
    const br = ctx.createBufferSource(); br.buffer = Sfx.noise;
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = (VOX[vowel][2] ? VOX[vowel][2][0] : 2800) * shift; bf.Q.value = 2.5;
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(level * 0.05, t + 0.03); bg.gain.setValueAtTime(level * 0.05, end); bg.gain.exponentialRampToValueAtTime(0.0001, end + rel);
    br.connect(bf).connect(bg).connect(pan);
    br.start(t, Math.random()); br.stop(end + rel + 0.02);
  }
  for (const o of oscs) { o.start(startAt); o.stop(end + rel + 0.03); }
  vib.start(startAt); vib.stop(end + rel + 0.03);
  state.end = end; state.midi = midi;
  if (cons && kind !== 'harm') consonant(ctx, pan, t, cons, vowel, shift, level * (kind === 'chop' ? 0.8 : 1), f0);
}

// The consonant, said in the moment before the vowel lands on the beat.
function consonant(ctx, out, t, cons, vowel, shift, level, f0) {
  const noise = (at, dur, type, freq, q, vol, curve = 'burst') => {
    const s = ctx.createBufferSource(); s.buffer = Sfx.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    if (curve === 'burst') { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + dur); }
    else { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.45); g.gain.setValueAtTime(vol, at + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.012); }
    s.connect(f).connect(g).connect(out);
    s.start(at, Math.random() * 1.5); s.stop(at + dur + 0.03);
  };
  // A soft voiced murmur under the voiced stops (b, d, g, z, j).
  const murmur = (at, dur) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f0 * 0.5;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(level * 0.25, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(f).connect(g).connect(out); o.start(at); o.stop(at + dur + 0.02);
  };
  const v = level, F = VOX[vowel] || VOX.a, L = CONS_LEAD[cons] || 0.04, at = t - L;
  const front = vowel === 'i' || vowel === 'e';
  // Aspiration: breath through the shape of the coming vowel.
  const aspirate = (s, d, vol) => { noise(s, d, 'bandpass', F[1][0] * shift, 2, vol, 'hold'); noise(s, d, 'bandpass', F[2][0] * shift, 2.5, vol * 0.7, 'hold'); };
  switch (cons) {
    case 's': noise(at, L, 'bandpass', 6800, 1.1, v * 0.75, 'hold'); break;
    case 'z': noise(at, L, 'bandpass', 6500, 1.1, v * 0.4, 'hold'); murmur(at, L); break;
    case 'sh': noise(at, L, 'bandpass', 3600, 1.4, v * 0.8, 'hold'); break;
    case 'j': noise(at, L * 0.6, 'bandpass', 3400, 1.4, v * 0.45, 'hold'); murmur(at, L); break;
    case 'ts': noise(at, 0.012, 'highpass', 4200, 0.7, v * 0.7); noise(at + 0.012, L - 0.012, 'bandpass', 6800, 1.2, v * 0.6, 'hold'); break;
    case 'ch': noise(at, 0.012, 'highpass', 3500, 0.7, v * 0.7); noise(at + 0.012, L - 0.012, 'bandpass', 3500, 1.4, v * 0.65, 'hold'); break;
    case 'h': aspirate(at, L, v * 0.5); break;
    case 'f': noise(at, L, 'bandpass', 1700, 0.6, v * 0.32, 'hold'); aspirate(at + L * 0.5, L * 0.5, v * 0.25); break;
    case 'k': noise(at + 0.018, 0.012, 'bandpass', front ? 3000 : 1800, 2, v * 1.1); aspirate(at + 0.028, L - 0.028, v * 0.35); break;
    case 'g': noise(at + 0.02, 0.01, 'bandpass', front ? 2800 : 1700, 2, v * 0.6); murmur(at, 0.025); break;
    case 't': noise(at + 0.016, 0.01, 'highpass', 4000, 0.8, v * 0.95); aspirate(at + 0.024, L - 0.024, v * 0.25); break;
    case 'd': noise(at + 0.015, 0.008, 'highpass', 3600, 0.8, v * 0.55); murmur(at, 0.022); break;
    case 'p': noise(at + 0.016, 0.01, 'lowpass', 1400, 0.7, v * 1.0); aspirate(at + 0.024, L - 0.024, v * 0.2); break;
    case 'b': noise(at + 0.015, 0.008, 'lowpass', 1200, 0.7, v * 0.55); murmur(at, 0.022); break;
    case 'r': noise(at, 0.01, 'bandpass', 2000, 2, v * 0.18); break;
    default: break;
  }
}

// A choir pad: the group (or the crowd of voices on the record) singing "aah" or "ooh".
function choirChord(ctx, out, t, notes, len, vowel, S) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07, t + Math.min(0.6, len * 0.25));
  g.gain.setValueAtTime(0.07, t + len * 0.8);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
  g.connect(lp).connect(out);
  const lfo = ctx.createOscillator(), ld = ctx.createGain(); lfo.frequency.value = 5.2; ld.gain.value = 14; lfo.connect(ld);
  for (const n0 of notes) {
    let n = n0;
    while (n > 74) n -= 12;
    while (n < 57) n += 12;
    for (const det of [-9, 9]) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(voxWave(ctx, formantsFor(vowel, '', S.teto ? 0.95 : 1.04), midiHz(n), `${vowel}choir`));
      o.frequency.value = midiHz(n); o.detune.value = det; ld.connect(o.detune);
      o.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
  }
  lfo.start(t); lfo.stop(t + len + 0.05);
}

/* ---------- The band ---------- */
let songCurve = null;
function distCurve() {
  if (songCurve) return songCurve;
  const n = 1024; songCurve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; songCurve[i] = Math.tanh(x * 4); }
  return songCurve;
}

// One note of one instrument, at audio time `t`.
function songVoice(ctx, out, kind, t, a1, a2, beat, S, a3) {
  const env = (g, peak, attack, decay) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); };
  const noise = (dur) => { const s = ctx.createBufferSource(); s.buffer = Sfx.noise; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; };
  const osc = (type, f, dur, det = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(t + dur + 0.05); return o; };
  const filt = (type, f, q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const v = typeof a1 === 'number' && a1 <= 1 ? a1 : 1;
  switch (kind) {
    case 'kick': {
      const o = osc('sine', 150, 0.35), g = ctx.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
      env(g, 0.95 * (a1 || 1), 0.002, 0.3);
      const c = noise(0.01), cg = ctx.createGain(); env(cg, 0.25 * (a1 || 1), 0.001, 0.012); c.connect(filt('highpass', 3000)).connect(cg).connect(out);
      o.connect(g).connect(out); break;
    }
    case 'snare': case 'clap': case 'gate': case 'brush': case 'rim': {
      const s = noise(kind === 'gate' ? 0.4 : 0.22), g = ctx.createGain();
      const f = filt(kind === 'brush' ? 'bandpass' : 'bandpass', kind === 'clap' ? 1400 : kind === 'rim' ? 3500 : kind === 'brush' ? 4500 : 2000, kind === 'rim' ? 3 : 0.8);
      const vol = kind === 'clap' ? 0.4 : kind === 'rim' ? 0.22 : kind === 'brush' ? 0.12 * (a1 || 1) : kind === 'gate' ? 0.55 : 0.2 + (a1 || 0) * 0.28;
      if (kind === 'gate') { g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol * 0.8, t + 0.22); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26); }
      else if (kind === 'clap') { g.gain.setValueAtTime(0.0001, t); for (let i = 0; i < 3; i++) { g.gain.exponentialRampToValueAtTime(vol, t + i * 0.011 + 0.002); g.gain.exponentialRampToValueAtTime(vol * 0.2, t + i * 0.011 + 0.01); } g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); }
      else env(g, vol, 0.002, kind === 'rim' ? 0.05 : kind === 'brush' ? 0.18 : 0.16);
      s.connect(f).connect(g).connect(out);
      if (kind === 'snare' || kind === 'gate') { const o = osc('triangle', 190, 0.1), og = ctx.createGain(); env(og, 0.2, 0.002, 0.08); o.connect(og).connect(out); }
      break;
    }
    case 'hat': case 'shaker': case 'ride': {
      const s = noise(kind === 'ride' ? 0.4 : 0.06), g = ctx.createGain();
      s.connect(filt(kind === 'shaker' ? 'bandpass' : 'highpass', kind === 'shaker' ? 6000 : kind === 'ride' ? 6500 : 8000, kind === 'shaker' ? 1.5 : 0.7)).connect(g).connect(out);
      env(g, (kind === 'ride' ? 0.08 : kind === 'shaker' ? 0.07 : 0.11) * (a1 || 0.6), 0.001, kind === 'ride' ? 0.35 : kind === 'shaker' ? 0.05 : 0.04);
      break;
    }
    case 'tom': {
      const o = osc('sine', midiHz(a1 || 50), 0.4), g = ctx.createGain();
      o.frequency.setValueAtTime(midiHz(a1 || 50), t);
      o.frequency.exponentialRampToValueAtTime(midiHz((a1 || 50) - 7), t + 0.3);
      env(g, 0.5, 0.003, 0.32); o.connect(g).connect(out); break;
    }
    case 'crash': {
      const s = noise(1.8), g = ctx.createGain();
      s.connect(filt('highpass', 4500)).connect(g).connect(out); env(g, 0.17, 0.002, 1.6); break;
    }
    case 'vinyl': {
      for (let i = 0; i < 5; i++) { const at = t + Math.random() * (a1 || 4) * beat; const s = ctx.createBufferSource(); s.buffer = Sfx.noise; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.03, at + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.01); s.connect(filt('highpass', 2500)).connect(g).connect(out); s.start(at, Math.random()); s.stop(at + 0.02); }
      break;
    }
    case 'riser': {
      const s = noise(a1 * beat), f = filt('bandpass', 400, 3), g = ctx.createGain();
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + a1 * beat);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + a1 * beat); g.gain.linearRampToValueAtTime(0.0001, t + a1 * beat + 0.05);
      s.connect(f).connect(g).connect(out); break;
    }
    case 'bass': {
      const type = a3 || 'saw', len = a2 * beat, f0 = midiHz(a1), g = ctx.createGain();
      if (type === 'sub' || type === 'round' || type === '808') {
        const o = osc('sine', f0, len + 0.1);
        if (type === '808') { o.frequency.setValueAtTime(f0 * 1.5, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.06); }
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(type === '808' ? 0.26 : 0.42, t + 0.01); g.gain.setValueAtTime(type === '808' ? 0.22 : 0.35, t + len * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
        if (type === '808') { const ws = ctx.createWaveShaper(); ws.curve = distCurve(); o.connect(ws).connect(g); } else o.connect(g);
        const o2 = osc('triangle', f0 * 2, len); const g2 = ctx.createGain(); g2.gain.value = 0.08; o2.connect(g2).connect(g);
      } else {
        const o = osc(type === 'square' ? 'square' : 'sawtooth', f0, len), f = filt('lowpass', 900, type === 'slap' ? 4 : 1);
        f.frequency.setValueAtTime(type === 'slap' ? 2400 : type === 'dist' ? 1800 : 1000, t); f.frequency.exponentialRampToValueAtTime(type === 'pulse' ? 400 : 220, t + (type === 'slap' ? 0.08 : 0.2));
        env(g, type === 'square' ? 0.14 : 0.27, 0.004, len);
        if (type === 'dist') { const ws = ctx.createWaveShaper(); ws.curve = distCurve(); o.connect(ws).connect(f); } else o.connect(f);
        f.connect(g);
      }
      g.connect(out); break;
    }
    case 'supersaw': case 'pad': case 'strings': case 'brass': {
      const len = a2 * beat, f = filt('lowpass', kind === 'pad' ? 1400 : kind === 'strings' ? 2600 : 3400), g = ctx.createGain();
      if (kind === 'pad' || kind === 'strings') { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(kind === 'strings' ? 0.035 : 0.04, t + Math.min(0.5, len * 0.3)); g.gain.setValueAtTime(kind === 'strings' ? 0.035 : 0.04, t + len * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.2); }
      else if (kind === 'brass') { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + len); f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.05); f.frequency.exponentialRampToValueAtTime(1200, t + len); }
      else env(g, 0.045, 0.01, len);
      f.connect(g).connect(out);
      const dets = kind === 'supersaw' ? [-14, -5, 5, 14] : kind === 'strings' ? [-8, 0, 8] : kind === 'brass' ? [-6, 6] : [-7, 7];
      for (const n of a1) for (const d of dets) osc('sawtooth', midiHz(n), len + 0.25, d).connect(f);
      break;
    }
    case 'stacc': {
      const g = ctx.createGain(), f = filt('lowpass', 2200);
      env(g, 0.05, 0.008, 0.12); f.connect(g).connect(out);
      for (const d of [-7, 7]) osc('sawtooth', midiHz(a1), 0.2, d).connect(f);
      break;
    }
    case 'power': {
      const len = a2 * beat, g = ctx.createGain(), ws = ctx.createWaveShaper(), f = filt('lowpass', 3200);
      ws.curve = distCurve();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.005); g.gain.setValueAtTime(0.06, t + len * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
      const pre = ctx.createGain(); pre.gain.value = 0.7;
      pre.connect(ws).connect(f).connect(g).connect(out);
      for (const [r, d] of [[0, -8], [7, 0], [12, 8]]) osc('sawtooth', midiHz(a1 + r), len, d).connect(pre);
      break;
    }
    case 'piano': {
      const len = (a2 || 1) * beat, vol = 0.07 * (a3 || 1);
      for (const n of a1) {
        const f0 = midiHz(n), g = ctx.createGain(), f = filt('lowpass', Math.min(6000, f0 * 6));
        f.frequency.setValueAtTime(Math.min(6000, f0 * 6), t); f.frequency.exponentialRampToValueAtTime(Math.max(300, f0 * 1.5), t + len + 0.3);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6);
        osc('triangle', f0, len + 0.7).connect(f); const h = osc('sine', f0 * 2, len + 0.7, 3); const hg = ctx.createGain(); hg.gain.value = 0.3; h.connect(hg).connect(f);
        f.connect(g).connect(out);
      }
      break;
    }
    case 'epiano': {
      // A Rhodes-ish tine: a sine carrier, frequency-modulated by a bell-like partial.
      const len = (a2 || 1) * beat;
      for (const n of a1) {
        const f0 = midiHz(n), car = osc('sine', f0, len + 0.8), mod = osc('sine', f0 * 7.0, 0.4), mg = ctx.createGain(), g = ctx.createGain();
        mg.gain.setValueAtTime(f0 * 1.6, t); mg.gain.exponentialRampToValueAtTime(f0 * 0.05, t + 0.35);
        mod.connect(mg).connect(car.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.005); g.gain.exponentialRampToValueAtTime(0.02, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.7);
        car.connect(g).connect(out);
      }
      break;
    }
    case 'pluck': {
      // Offbeat guitar chops: bright, very short.
      const g = ctx.createGain(), f = filt('bandpass', 1800, 0.8);
      env(g, 0.06, 0.002, 0.09); f.connect(g).connect(out);
      for (const n of a1) osc('sawtooth', midiHz(n), 0.14).connect(f);
      break;
    }
    case 'marimba': {
      const f0 = midiHz(a1), g = ctx.createGain();
      env(g, 0.06, 0.002, 0.25);
      osc('sine', f0, 0.3).connect(g); const h = osc('sine', f0 * 4, 0.08), hg = ctx.createGain(); env(hg, 0.03, 0.001, 0.05); h.connect(hg).connect(out);
      g.connect(out); break;
    }
    case 'arp': {
      const f0 = midiHz(a1), g = ctx.createGain(), f = filt('lowpass', 2600, 6);
      f.frequency.setValueAtTime(3800, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.15);
      env(g, 0.04 * (a3 || 1), 0.003, a2 * beat);
      osc('sawtooth', f0, a2 * beat + 0.05).connect(f); f.connect(g).connect(out); break;
    }
    case 'chip': {
      const g = ctx.createGain(); env(g, 0.03, 0.001, a2 * beat * 0.9);
      osc('square', midiHz(a1), a2 * beat).connect(g).connect(out); break;
    }
    case 'bell': {
      const g = ctx.createGain(); env(g, 0.04, 0.003, 0.5); g.connect(out);
      for (const [r, vv] of [[1, 1], [2.01, 0.3], [3.98, 0.12]]) { const o = osc('sine', midiHz(a1) * r, 0.6), og = ctx.createGain(); og.gain.value = vv; o.connect(og).connect(g); }
      break;
    }
    default: break;
  }
  void v;
}

/* ---------- The city's own music ---------- */
// Walking around the city by day: a mellow, sunny loop on the same synths.
Sfx.tracks.city = {
  bpm: 96, level: 0.42, ambient: 0.2,
  chords: [[53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62], [57, 60, 64, 67]],
  beat(S, beat, t, beatLen) {
    const bar2 = beat % 8, ci = Math.floor(beat / 8) % this.chords.length, chord = this.chords[ci];
    if (bar2 === 0) S.pad(chord, t, beatLen * 8, 0.022);
    if (beat % 2 === 0) S.pluck(chord[0] - 12, t, beatLen * 1.6, 0.09, 'triangle');
    const arp = [0, 2, 1, 3, 2, 1, 3, 2];
    S.pluck(chord[arp[bar2]] + 12, t + beatLen * 0.5, beatLen * 1.2, 0.035, 'sine', true);
    if (bar2 % 4 === 0) S.bell(chord[3] + 12, t, beatLen * 2, 0.5);
    if (beat % 2 === 0) { const g = S.ctx.createGain(), o = S.ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.connect(g).connect(S.music); o.start(t); o.stop(t + 0.22); }
  },
};
// By night: slower, jazzier, the piano and a soft brush beat under the neon.
Sfx.tracks.cityNight = {
  bpm: 78, level: 0.4, ambient: 0.25,
  chords: [[50, 57, 60, 65], [55, 59, 62, 65], [48, 55, 59, 64], [53, 57, 60, 64]],
  beat(S, beat, t, beatLen) {
    const bar2 = beat % 8, ci = Math.floor(beat / 8) % this.chords.length, chord = this.chords[ci];
    if (bar2 === 0) { S.pad(chord, t, beatLen * 8, 0.02); S.piano(chord[0] - 12, t, beatLen * 4, 0.07); }
    if (bar2 === 4) S.piano(chord[0] - 5, t, beatLen * 3, 0.04);
    for (const [at, k] of [[0.5, 1], [1.5, 2], [2.75, 3], [3.5, 2]]) if (Math.floor(at) === bar2 % 4) S.piano(chord[k] + 12, t + (at % 1) * beatLen, beatLen * 1.5, 0.03);
    if (bar2 === 0 && ci % 2 === 1) for (const [at, n] of [[0, 76], [1, 74], [2, 72], [3, 69]]) S.piano(n, t + at * beatLen, beatLen, 0.045);
    S.hit({ dur: 0.12, freq: 6000, q: 0.5, vol: 0.02 + (beat % 2) * 0.015, type: 'highpass', delay: t - S.ctx.currentTime });
  },
};

/* ---------- Keeping the stage in time ---------- */
function heardTime(ctx) {
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts.contextTime > 0 && ts.performanceTime > 0) {
      const t = ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      // Never ahead of the clock, never more than a fifth of a second behind it.
      return Math.min(ctx.currentTime, Math.max(ctx.currentTime - 0.2, t));
    }
  }
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
}

// Every voice shape a song will need, built a few at a time while the intro plays, so
// none of them has to be made in the middle of a phrase (that's what made it stutter).
function warmVoice(ctx, L, S) {
  const jobs = [], seen = new Set();
  for (const ev of L.events) {
    const kind = ev[1];
    if (kind !== 'lead' && kind !== 'harm' && kind !== 'chop') continue;
    const tok = ev[4] || 'la';
    if (tok === '-') continue;
    const vowel = tok === 'n' ? 'n' : tok[tok.length - 1], cons = consOf(tok);
    if (!VOX[vowel]) continue;
    const shift = (S.teto ? 0.94 : 1.06) * (kind === 'harm' && ev[6] === 'up' ? 1.06 : 1);
    const f0 = midiHz(ev[2]);
    const add = (formants, key) => { const k = `${key}|${Math.round(f0 / 5)}`; if (!seen.has(k) && !voxCache.has(k)) { seen.add(k); jobs.push([formants, f0, key]); } };
    add(formantsFor(vowel, '', shift), `${vowel}${shift}`);
    if (cons === 'm' || cons === 'n') add(VOX[cons].map(([f, b, a]) => [f * shift, b, a]), `${cons}${shift}`);
    else if (cons === 'y') add(formantsFor('i', '', shift), `i${shift}`);
    else if (cons === 'w') add(formantsFor('u', '', shift), `u${shift}`);
    else if (cons) add(formantsFor(vowel, cons, shift, /^(k|g|t|d|p|b|ch|ts)/.test(cons) ? 'stop' : 'fric'), `${vowel}~${cons}${shift}`);
  }
  // The first phrase straight away, the rest a handful per frame.
  let i = 0;
  const step = (n) => { const end = Math.min(jobs.length, i + n); for (; i < end; i++) voxWave(ctx, jobs[i][0], jobs[i][1], jobs[i][2]); if (i < jobs.length) setTimeout(() => step(6), 16); };
  step(24);
}
