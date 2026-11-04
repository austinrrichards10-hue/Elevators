// Idol songs, synthesized: bright J-pop in the classic style. Four-on-the-floor kicks and
// claps, offbeat hats, an octave-bouncing bass, supersaw chords over the "royal road"
// progression (IV V iii vi), a glittering bell arpeggio, risers into each chorus, and Miku
// singing: a Vocaloid-style voice built from vowel formants and consonants, syllable by
// syllable, to Japanese lyrics (with English shown underneath on stage). The group's songs
// have the other three singing harmony on the choruses. Every song is written out as
// sections of bars; its chart for the stage comes from the sung melody, so the notes you hit
// are the syllables you hear.

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];

// A hook: four bars of [beat, scale step, length in beats]. Steps count up the scale from the
// key's root (7 is the octave). Lyrics: each line is one pass of a hook (or the pre-chorus),
// sung a syllable per note: [Japanese in romaji, English].
const SONGS = {
  snowdrop: {
    title: 'Snowdrop Heart', artist: 'Miku', bpm: 150, root: 69, scale: MAJOR, unlock: () => true, stars: 1,
    mood: 'Bright and hopeful: the first song she ever sang in the city.',
    verse: [3, 4, 2, 5], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 4, 1], [1, 4, 0.5], [1.5, 5, 0.5], [2, 4, 1], [3, 2, 1], [4, 1, 1.5], [5.5, 2, 0.5], [6, 4, 2], [8, 4, 1], [9, 5, 0.5], [9.5, 7, 0.5], [10, 5, 1], [11, 4, 1], [12, 2, 2], [14, 1, 1], [15, 0, 1]],
    hookC: [[0, 7, 0.5], [0.5, 7, 0.5], [1, 8, 1], [2, 7, 0.5], [2.5, 6, 0.5], [3, 5, 1], [4, 6, 0.5], [4.5, 5, 0.5], [5, 4, 1], [6, 5, 1], [7, 7, 1], [8, 9, 1.5], [9.5, 8, 0.5], [10, 7, 1], [11, 5, 1], [12, 4, 0.5], [12.5, 5, 0.5], [13, 7, 1.5], [14.5, 5, 0.5], [15, 4, 1]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['shi ro i yu ki no na ka de hi to ri ki e so u', 'Alone in the white snow, about to fade away'],
        ['ko go e ta yu bi sa ki ni ha na ga sa i ta no', 'and on my frozen fingertips, a flower bloomed'],
        ['ka ze ga fu i te mo ma da ke se na i hi ka ri', 'Even when the wind blows, a light that won\'t go out'],
        ['a no so ra no mu ko u ni ki mi ga ma te ru yo', 'Somewhere past that sky, you\'re waiting for me'],
      ],
      pre: [['to do ke to do ke ko no ko e yo ha ru ma de to', 'Reach them, reach them, this voice of mine, all the way to spring']],
      chorus: [
        ['su no o do ro p pu ha a to yu ki wo to ka shi te sa i te', 'Snowdrop Heart, melt the snow and bloom'],
        ['na i te mo i i yo mo u i chi do ta chi a ga re ba i i', 'It\'s okay to cry, as long as you get up once more'],
      ],
    },
  },
  ramune: {
    title: 'Summer Ramune', artist: 'Miku', bpm: 156, root: 62, scale: MAJOR, unlock: () => fameLevel() >= 1, stars: 1,
    mood: 'Fizzy, sunny, a song for the beach.',
    verse: [0, 3, 4, 0], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 4, 0.5], [0.5, 5, 0.5], [1, 7, 1], [2, 5, 0.5], [2.5, 4, 0.5], [3, 2, 1], [4, 4, 2], [8, 4, 0.5], [8.5, 5, 0.5], [9, 7, 1], [10, 9, 1], [11, 7, 1], [12, 5, 2]],
    hookC: [[0, 7, 1], [1, 9, 0.5], [1.5, 7, 0.5], [2, 5, 1], [3, 7, 1], [4, 9, 1.5], [5.5, 8, 0.5], [6, 7, 2], [8, 5, 1], [9, 7, 0.5], [9.5, 8, 0.5], [10, 9, 1], [11, 8, 1], [12, 7, 2], [14, 5, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
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
    title: 'Paper Plane Promise', artist: 'SNOWDROP', bpm: 132, root: 62, scale: MAJOR, unlock: () => idol.flags.lyricsDone || fameLevel() >= 5, stars: 1,
    mood: 'A slower one, for the friends who got her here.',
    verse: [0, 4, 5, 3], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 2, 1.5], [1.5, 1, 0.5], [2, 2, 1], [3, 4, 1], [4, 5, 3], [8, 4, 1.5], [9.5, 2, 0.5], [10, 1, 1], [11, 0, 1], [12, 1, 3]],
    hookC: [[0, 7, 1.5], [1.5, 6, 0.5], [2, 5, 1], [3, 4, 1], [4, 5, 2], [6, 7, 2], [8, 8, 1.5], [9.5, 7, 0.5], [10, 5, 1], [11, 4, 1], [12, 4, 1], [13, 5, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'chorus', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['ka mi hi ko u ki ni ka i ta', 'On a paper plane I wrote'],
        ['ya ku so ku hi to tsu da ke ne', 'just one promise'],
        ['ka ze ni no se te to ba shi ta', 'I set it on the wind and let it fly'],
        ['ki mi no ma do ma de to do ke', 'all the way to your window'],
      ],
      pre: [['na ga re bo shi ni ne ga u yo ri mo ji bu n de', 'Rather than wish on a shooting star, I\'ll catch it myself']],
      chorus: [
        ['ki re i na mo no wa tsu zu ka na i ne', 'Beautiful things never last'],
        ['da ka ra i ma ko ko de mi te i te ne', 'so watch them now, right here'],
      ],
    },
  },
  sakura: {
    title: 'Neon Sakura Drive', artist: 'SNOWDROP', bpm: 160, root: 65, scale: MAJOR, unlock: () => !!idol.flags.joined, stars: 2,
    mood: 'Night lights and petals on the wind: their first single as a group.',
    verse: [5, 3, 4, 0], chorus: [3, 4, 2, 5], pre: [1, 2, 3, 4],
    hookV: [[0, 2, 0.5], [0.5, 4, 0.5], [1, 5, 1], [2, 4, 0.5], [2.5, 2, 0.5], [3, 4, 1], [4, 5, 1], [5, 7, 0.5], [5.5, 5, 0.5], [6, 4, 2], [8, 2, 0.5], [8.5, 4, 0.5], [9, 5, 1], [10, 7, 1], [11, 9, 1], [12, 8, 1.5], [13.5, 7, 0.5], [14, 5, 2]],
    hookC: [[0, 9, 1], [1, 8, 0.5], [1.5, 7, 0.5], [2, 8, 1], [3, 9, 1], [4, 10, 1.5], [5.5, 9, 0.5], [6, 7, 2], [8, 7, 0.5], [8.5, 8, 0.5], [9, 9, 1], [10, 8, 0.5], [10.5, 7, 0.5], [11, 5, 1], [12, 7, 1], [13, 8, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['ne o n no ma chi ni sa ku ra ga ma u yo ru ni ki mi', 'In the neon town, on a night of dancing petals, you'],
        ['a ka i shi n go u mo i ma da ke wa ki ni shi na i', 'Even the red lights, just for tonight, we won\'t mind them'],
        ['ha shi ri da shi ta ki mo chi wa to ma ra na i no yo o', 'This feeling that\'s started running just won\'t stop'],
        ['ka ga mi no na ka no wa ta shi ga wa ra te ru mi e ru', 'I can see myself smiling in the mirror'],
      ],
      pre: [['ra i to wo tsu ke te bo ri u mu a ge te ko n', 'Lights on, volume up, tonight']],
      chorus: [
        ['ne o n sa ku ra do ra i bu ma chi wo ka ke nu ke', 'Neon Sakura Drive, racing through the town'],
        ['fu ta ri da ke no se ka i ni a sa ga ku ru ma de', 'in a world for just us two, until the morning comes'],
      ],
      bridge: [['ha na bi ra ga ki e te mo wa su re na i ze t ta i', 'Even when the petals are gone, I\'ll never forget']],
    },
  },
  pastel: {
    title: 'Pastel Rain', artist: 'SNOWDROP', bpm: 140, root: 66, scale: MAJOR, unlock: () => !!idol.flags.joined && fameLevel() >= 4, stars: 2,
    mood: 'Soft and sweet: a rainy-day love song.',
    verse: [5, 3, 4, 0], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 2, 1], [1, 4, 0.5], [1.5, 5, 0.5], [2, 4, 1], [3, 2, 1], [4, 4, 1.5], [5.5, 5, 0.5], [6, 7, 2], [8, 7, 1], [9, 5, 0.5], [9.5, 4, 0.5], [10, 5, 1], [11, 4, 1], [12, 2, 2], [14, 4, 2]],
    hookC: [[0, 9, 1], [1, 7, 0.5], [1.5, 9, 0.5], [2, 10, 1], [3, 9, 1], [4, 7, 1], [5, 5, 1], [6, 7, 2], [8, 9, 1], [9, 7, 0.5], [9.5, 9, 0.5], [10, 11, 1], [11, 10, 1], [12, 9, 1], [13, 7, 1], [14, 9, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['pa su te ru no a me ga ma chi wo so me te ku', 'Pastel rain is painting the town'],
        ['ka sa mo sa sa zu ni ki mi wo sa ga shi te ru', 'I\'m looking for you without an umbrella'],
        ['mi zu ta ma ri ni u tsu ru ne o n ga yu re', 'Neon wobbles in the puddles'],
        ['ni ji i ro no shi zu ku ga ho ho wo ka za ru', 'rainbow drops on my cheeks'],
      ],
      pre: [['a me a ga ri no so ra ni ka ke ru ni ji no ha', 'In the sky after the rain, a rainbow bridge']],
      chorus: [
        ['pa su te ru re i n fu ri so so i de ki mi ni', 'Pastel rain, keep falling, down to you'],
        ['nu re ta ka mi mo ki ni shi na i ze n bu su ki', 'I don\'t care about my wet hair, I love all of it'],
      ],
    },
  },
  harajuku: {
    title: 'Harajuku Heartbeat', artist: 'SNOWDROP', bpm: 172, root: 63, scale: MAJOR, unlock: () => !!idol.flags.joined && fameLevel() >= 5, stars: 3,
    mood: 'Fast, cute and loud: the crowd shouts every word.',
    verse: [3, 4, 5, 0], chorus: [3, 4, 2, 5], pre: [1, 2, 3, 4],
    hookV: [[0, 4, 0.5], [0.5, 4, 0.5], [1, 5, 0.5], [1.5, 7, 0.5], [2, 5, 1], [3, 4, 0.5], [3.5, 2, 0.5], [4, 4, 1], [5, 5, 1], [6, 4, 2], [8, 7, 0.5], [8.5, 7, 0.5], [9, 8, 0.5], [9.5, 9, 0.5], [10, 8, 1], [11, 7, 1], [12, 5, 2], [14, 4, 2]],
    hookC: [[0, 9, 0.5], [0.5, 9, 0.5], [1, 10, 0.5], [1.5, 9, 0.5], [2, 7, 1], [3, 9, 1], [4, 11, 1], [5, 10, 0.5], [5.5, 9, 0.5], [6, 7, 2], [8, 9, 0.5], [8.5, 10, 0.5], [9, 11, 1], [10, 12, 1], [11, 11, 1], [12, 9, 1], [13, 10, 1], [14, 9, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['ha ra ju ku no ka do de to ki me ki ga to ma ra na i', 'On a Harajuku corner my heart won\'t stop racing'],
        ['ku re e pu hi to ku chi ka ga mi no ma e de wi n ku', 'One bite of crepe, a wink in the mirror'],
        ['ka wa i i t te i wa re ta ku te ri bo n wo mu su', 'I tied a ribbon, wanting to hear "so cute"'],
        ['de mo ho n to wa ne tsu yo ku na ri ta i n da ki mi', 'but really, I want to be strong, for you'],
      ],
      pre: [['do ki do ki do ki do ki ha a to ga sa ke n de', 'Doki doki doki doki, my heart is shouting']],
      chorus: [
        ['ha ra ju ku ha a to bi i to ki mi to o do ri ta i', 'Harajuku Heartbeat, I want to dance with you'],
        ['mo t to ha ya ku mo t to ta ka ku so ra ma de to bo', 'faster, higher, let\'s fly all the way to the sky'],
      ],
    },
  },
  midnight: {
    title: 'Midnight Train Home', artist: 'Miku', bpm: 118, root: 60, scale: MAJOR, unlock: () => !!idol.flags.joined && fameLevel() >= 6, stars: 2,
    mood: 'The last train after a long night, the city going by.',
    verse: [5, 3, 0, 4], chorus: [3, 4, 2, 5], pre: [1, 4],
    hookV: [[0, 4, 1.5], [1.5, 2, 0.5], [2, 4, 1], [3, 5, 1], [4, 4, 3], [8, 5, 1.5], [9.5, 4, 0.5], [10, 2, 1], [11, 1, 1], [12, 2, 3]],
    hookC: [[0, 7, 1], [1, 8, 1], [2, 9, 2], [4, 8, 1], [5, 7, 1], [6, 5, 2], [8, 4, 1], [9, 5, 1], [10, 7, 2], [12, 5, 1], [13, 4, 1], [14, 2, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'chorus', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['sa i shu u de n sha no ma do', 'In the window of the last train'],
        ['ma chi no hi ka ri ga na ga re', 'the city\'s lights flowing past'],
        ['tsu ka re ta ka o wo ka ku shi', 'I hide my tired face'],
        ['a shi ta mo u ta e ru ka na', 'Will I still be able to sing tomorrow?'],
      ],
      pre: [['o ya su mi to ki yo u ha na shi ka ke ru mi n', 'Goodnight, I whisper to everyone today']],
      chorus: [
        ['mi tsu na i to re i n ho o mu ma', 'Midnight train, all the way home'],
        ['yu me no tsu zu ki wa a shi ta ni ne', 'the rest of the dream, tomorrow'],
      ],
    },
  },
  runway: {
    title: 'Starlight Runway', artist: 'SNOWDROP', bpm: 168, root: 64, scale: MAJOR, unlock: () => !!idol.flags.tvBooked || fameLevel() >= 6, stars: 3,
    mood: 'Their arena anthem: fast, loud, impossible not to jump to.',
    verse: [5, 4, 3, 4], chorus: [3, 4, 2, 5], pre: [3, 4, 5, 4],
    hookV: [[0, 5, 0.5], [0.5, 5, 0.5], [1, 4, 0.5], [1.5, 5, 0.5], [2, 7, 1], [3, 5, 1], [4, 4, 0.5], [4.5, 4, 0.5], [5, 2, 0.5], [5.5, 4, 0.5], [6, 5, 2], [8, 5, 0.5], [8.5, 7, 0.5], [9, 9, 1], [10, 8, 0.5], [10.5, 7, 0.5], [11, 5, 1], [12, 7, 2], [14, 4, 2]],
    hookC: [[0, 7, 0.5], [0.5, 9, 0.5], [1, 11, 1], [2, 9, 0.5], [2.5, 7, 0.5], [3, 9, 1], [4, 10, 0.5], [4.5, 9, 0.5], [5, 7, 1], [6, 8, 1], [7, 9, 1], [8, 11, 1], [9, 12, 1], [10, 11, 0.5], [10.5, 9, 0.5], [11, 7, 1], [12, 9, 1.5], [13.5, 8, 0.5], [14, 7, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['ka ka to wo na ra shi te ra n we i wo a ru i te ku yo', 'Heels clicking, I walk down the runway'],
        ['fu ra shu no a me no na ka de mo ma bu ta wa to ji na i', 'even in a rain of flashes, I won\'t close my eyes'],
        ['da re ka no ma ne ja na i wa ta shi da ke no su te p pu', 'Not copying anyone: a step that\'s only mine'],
        ['su ta a ra i to ga yo n de ru mo u ha shi re ru yo ne', 'The starlight is calling. I can run now'],
      ],
      pre: [['ka u n to da u n go yo n sa n ni i chi go', 'Countdown: five, four, three, two, one, go']],
      chorus: [
        ['su ta ra i to ra n we i ka ga ya ke mo t to ta ka ku', 'Starlight Runway, shine, higher and higher'],
        ['ze n bu no hi ka ri wo a tsu me te ki mi ni a ge ru yo', 'I\'ll gather every light and give it to you'],
      ],
      bridge: [['na ki mu shi da t ta ki no u no wa ta shi ni sa yo na ra', 'Goodbye to yesterday\'s me, the crybaby']],
    },
  },
  crown: {
    title: 'Crown of Light', artist: 'Miku', bpm: 176, root: 67, scale: MAJOR, unlock: () => false, stars: 4,
    mood: 'Written for one night only: the Tokyo Dome.',
    verse: [5, 3, 0, 4], chorus: [3, 4, 2, 5], pre: [1, 2, 3, 4],
    hookV: [[0, 4, 1], [1, 5, 0.5], [1.5, 7, 0.5], [2, 5, 1], [3, 4, 1], [4, 2, 1.5], [5.5, 4, 0.5], [6, 5, 2], [8, 7, 1], [9, 8, 0.5], [9.5, 9, 0.5], [10, 8, 1], [11, 7, 1], [12, 5, 1.5], [13.5, 4, 0.5], [14, 5, 2]],
    hookC: [[0, 9, 1], [1, 10, 0.5], [1.5, 9, 0.5], [2, 11, 1], [3, 12, 1], [4, 11, 0.5], [4.5, 9, 0.5], [5, 7, 1], [6, 9, 1], [7, 11, 1], [8, 12, 1.5], [9.5, 11, 0.5], [10, 9, 1], [11, 8, 1], [12, 9, 1], [13, 11, 1], [14, 12, 2]],
    form: ['intro', 'verse', 'pre', 'chorus', 'inter', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'chorusUp', 'chorusUp', 'outro'],
    lyrics: {
      verse: [
        ['na n do mo yu ki ni u mo re te mo ma ta ta tsu', 'However many times I\'m buried in the snow, I stand again'],
        ['ko go e ta ho shi ga mi chi wo te ra shi ta no yo', 'A frozen star lit up the way for me'],
        ['ka n se i ga ka ze no yo u ni fu i te ku ru', 'The cheers come blowing in like the wind'],
        ['go ma n ni n no hi ka ri ga ka ga ya i te ru', 'Fifty thousand lights, shining'],
      ],
      pre: [['ko no shu n ka n no ta me ni u ta t te ki ta', 'It was for this moment that I sang']],
      chorus: [
        ['hi ka ri no ka n mu ri ka bu t te u ta u yo ne', 'Wearing a crown of light, I\'ll sing'],
        ['na mi da no sa ki ni sa i ta mi ra i wo shi n ji', 'I believe in the future that bloomed past the tears'],
      ],
      bridge: [['o bo e te ru a no yu ki no hi wo mo u ma ke', 'Remember? That snowy day. I won\'t lose again']],
    },
  },
  // Teto's: minor, heavy, a drill of sixteenths. Heard on screens, and when she rises.
  crimson: {
    title: 'Crimson Drill Parade', artist: 'Teto', bpm: 172, root: 60, scale: MINOR, teto: true, unlock: () => false, stars: 4,
    mood: 'Her debut. It went straight to number one.',
    verse: [0, 5, 3, 4], chorus: [5, 6, 0, 4], pre: [3, 4],
    hookV: [[0, 0, 0.5], [0.5, 0, 0.5], [1, 3, 0.5], [1.5, 0, 0.5], [2, 4, 1], [3, 3, 1], [4, 0, 0.5], [4.5, 0, 0.5], [5, 3, 0.5], [5.5, 4, 0.5], [6, 6, 2], [8, 7, 1], [9, 6, 0.5], [9.5, 4, 0.5], [10, 3, 1], [11, 4, 1], [12, 0, 2], [14, 2, 2]],
    hookC: [[0, 7, 0.5], [0.5, 7, 0.5], [1, 6, 0.5], [1.5, 7, 0.5], [2, 9, 1], [3, 7, 1], [4, 8, 1.5], [5.5, 7, 0.5], [6, 6, 2], [8, 7, 0.5], [8.5, 9, 0.5], [9, 10, 1], [10, 9, 1], [11, 7, 1], [12, 6, 1], [13, 4, 1], [14, 7, 2]],
    form: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'outro'],
    lyrics: {
      verse: [
        ['ku re na i no do ri ru ga ma wa ru yo gu ru gu ru to', 'My crimson drills are spinning, round and round'],
        ['hi za ma zu i te mi te na sa i wa ta shi ga o u sa', 'Kneel down and watch. I\'m the queen'],
      ],
      chorus: [
        ['ku ri mu zo n do ri ru pa re e do ha de ni ka ze', 'Crimson Drill Parade, blow it all away'],
        ['ma ke ru no wa a na ta yo ki ma t te ru n da ka', 'The one who loses is you. That\'s already decided'],
      ],
    },
  },
};

// Bars per section, and what plays in each.
const SECTION = {
  intro: { bars: 4, prog: 'chorus', drums: 'half', lead: null, bell: true },
  verse: { bars: 8, prog: 'verse', drums: 'verse', lead: 'hookV', chords: 'stab', words: 'verse' },
  pre: { bars: 4, prog: 'pre', drums: 'build', lead: 'pre', chords: 'pad', riser: true, words: 'pre' },
  chorus: { bars: 8, prog: 'chorus', drums: 'full', lead: 'hookC', chords: 'saw', bell: true, crash: true, words: 'chorus', harmony: true },
  chorusUp: { bars: 8, prog: 'chorus', drums: 'full', lead: 'hookC', chords: 'saw', bell: true, crash: true, up: 1, words: 'chorus', harmony: true },
  inter: { bars: 4, prog: 'chorus', drums: 'full', lead: null, bell: true, chords: 'saw' },
  bridge: { bars: 4, prog: 'verse', drums: 'half', lead: 'hookV', chords: 'pad', riser: true, words: 'bridge' },
  outro: { bars: 4, prog: 'chorus', drums: 'half', lead: null, bell: true, chords: 'pad', end: true },
};

// The song laid out in time: every note of every part, in beats from the start, with the
// chart's notes and the lyric lines alongside. Cached per song.
const songLayouts = {};
function layoutSong(id) {
  if (songLayouts[id]) return songLayouts[id];
  const S = SONGS[id];
  const events = [], chart = [], lines = [], sections = [];
  let bar = 0, keyShift = 0;
  const seen = {};
  const note = (step, oct = 0) => {
    const n = S.scale.length, o = Math.floor(step / n), s = ((step % n) + n) % n;
    return S.root + keyShift + S.scale[s] + 12 * (o + oct);
  };
  const chordNotes = (deg) => [0, 2, 4].map((k) => deg + k);
  // Takes the next line of words for a section, and hands out its syllables a note at a time.
  const wordsFor = (kind) => {
    const list = (S.lyrics && S.lyrics[kind]) || null;
    if (!list || !list.length) return null;
    const k = seen[kind] = (seen[kind] || 0);
    seen[kind]++;
    return list[k % list.length];
  };
  const sing = (notes, words) => {
    const tokens = words ? words[0].split(' ') : [];
    const line = { beat: notes.length ? notes[0][0] : 0, end: 0, tokens: [], en: words ? words[1] : '' };
    notes.forEach(([b, pitch, len, harmPitch], i) => {
      const tok = tokens[i] || (tokens.length ? '-' : 'la');
      events.push([b, 'lead', pitch, len, tok]);
      if (harmPitch !== undefined) events.push([b, 'harm', harmPitch, len, tok]);
      chart.push({ beat: b, pitch, len });
      if (tok !== '-') line.tokens.push({ beat: b, text: tok });
      line.end = b + len;
    });
    if (words) lines.push(line);
  };
  for (const name of S.form) {
    const sec = SECTION[name];
    // The last chorus lifts a whole tone, and stays up to the end.
    if (sec.up) keyShift = 2;
    const prog = S[sec.prog];
    for (let b = 0; b < sec.bars; b++) {
      const at = (bar + b) * 4;
      const deg = prog[b % prog.length];
      const chord = chordNotes(deg);
      // Drums.
      for (let q = 0; q < 4; q++) {
        const t = at + q;
        if (sec.drums === 'full' || sec.drums === 'verse' || (sec.drums === 'half' && q % 2 === 0) || (sec.drums === 'build' && (q % 2 === 0 || b >= 2))) events.push([t, 'kick']);
        if (sec.drums !== 'half' && (q === 1 || q === 3)) events.push([t, 'clap']);
        if (sec.drums === 'build' && b === sec.bars - 1) for (let s = 0; s < 4; s++) events.push([t + s * 0.25, 'snare', (q * 4 + s) / 16]);
        events.push([t + 0.5, 'hat', sec.drums === 'full' ? 0.9 : 0.6]);
        if (sec.drums === 'full') { events.push([t + 0.25, 'hat', 0.35]); events.push([t + 0.75, 'hat', 0.35]); }
      }
      // Bass: the root bouncing between octaves in eighths.
      for (let e = 0; e < 8; e++) events.push([at + e * 0.5, 'bass', note(deg, -2) + (e % 2 ? 12 : 0), 0.45]);
      // Chords.
      if (sec.chords === 'saw') for (let e = 0; e < 4; e++) events.push([at + e + 0.5, 'saw', chord.map((c) => note(c, -1)), 0.4]);
      else if (sec.chords === 'stab') for (const e of [0.5, 1.5, 2.5, 3.5]) events.push([at + e, 'stab', chord.map((c) => note(c, -1)), 0.22]);
      else if (sec.chords === 'pad' || name === 'intro') events.push([at, 'pad', chord.map((c) => note(c, -1)), 4]);
      // Bell arpeggio up the chord.
      if (sec.bell) for (let s = 0; s < 8; s++) events.push([at + s * 0.5, 'bell', note(chord[s % 3] + (s >= 3 ? 7 : 0), 1), 0.4]);
    }
    // The sung line: the hook for this section, repeated over its bars, a line of words each time.
    const group = S.artist !== 'Miku' && S.artist !== 'Teto';
    if (sec.lead) {
      const hook = sec.lead === 'pre' ? null : S[sec.lead];
      if (hook) {
        for (let rep = 0; rep < sec.bars / 4; rep++) {
          const notes = hook.map(([b, step, len]) => {
            // The second time round the last phrase climbs instead of resting.
            const s2 = rep === 1 && b >= 12 ? step + (b >= 14 ? 2 : 1) : step;
            return [bar * 4 + rep * 16 + b, note(s2), len, group && sec.harmony ? note(s2 + 2) : undefined];
          });
          sing(notes, wordsFor(sec.words));
        }
      } else {
        // The pre-chorus: rising, call-and-answer notes up the chord, building to the chorus.
        const notes = [];
        for (let b = 0; b < sec.bars; b++) {
          const deg = S[sec.prog][b % S[sec.prog].length];
          for (const [o, k] of [[0, 0], [1, 1], [2, 2], [3, 1]]) notes.push([(bar + b) * 4 + o, note(deg + k * 2 + (b >= 2 ? 2 : 0)), 0.9]);
        }
        sing(notes, wordsFor('pre'));
      }
    }
    sections.push({ name, beat: bar * 4, end: (bar + sec.bars) * 4 });
    if (sec.riser) events.push([(bar + sec.bars - 2) * 4, 'riser', 8]);
    if (sec.crash) events.push([bar * 4, 'crash']);
    // Instrumental bits still give the hands something to do: the kick on the one and three.
    if (!sec.lead) for (let b = 0; b < sec.bars; b++) for (const q of [0, 2]) chart.push({ beat: (bar + b) * 4 + q, pitch: null, len: 0.5, drum: true });
    bar += sec.bars;
  }
  events.push([bar * 4, 'crash']);
  events.sort((a, b) => a[0] - b[0]);
  chart.sort((a, b) => a.beat - b.beat);
  const layout = { id, events, chart, lines, sections, beats: bar * 4 + 2, seconds: (bar * 4 + 2) * 60 / S.bpm, bpm: S.bpm };
  songLayouts[id] = layout;
  return layout;
}

/* ---------- Playing a song ---------- */
// Schedules a song's notes a little ahead on the audio clock. Returns a handle with the start
// time (audio clock), the song's time now, and stop().
function playSong(id, { level = 0.8 } = {}) {
  Sfx.init();
  const ctx = Sfx.ctx, L = layoutSong(id), S = SONGS[id];
  const beat = 60 / S.bpm;
  const out = ctx.createGain();
  out.gain.value = level;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  out.connect(comp).connect(Sfx.master);
  // A little room on everything, and more on the voice (vocal.js-style plate).
  const send = ctx.createGain(); send.gain.value = 0.18; out.connect(send).connect(Sfx.verb);
  const voiceBus = ctx.createGain(); voiceBus.gain.value = 1;
  const vsend = ctx.createGain(); vsend.gain.value = 0.35;
  voiceBus.connect(out); voiceBus.connect(vsend).connect(Sfx.verb);
  // A short slapback echo on the voice, as on every idol record.
  const echo = ctx.createDelay(1); echo.delayTime.value = beat * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.22;
  const eg = ctx.createGain(); eg.gain.value = 0.18;
  voiceBus.connect(echo); echo.connect(fb).connect(echo); echo.connect(eg).connect(out);
  const start = ctx.currentTime + 0.35;
  let next = 0, stopped = false;
  const state = { vowel: 'a', harmVowel: 'a' };
  const handle = {
    id, start, beat, layout: L, out,
    time: () => ctx.currentTime - start,
    stop(fade = 0.6) { stopped = true; clearInterval(timer); out.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); setTimeout(() => out.disconnect(), fade * 1000 + 400); },
    done: () => ctx.currentTime - start > L.seconds,
  };
  const pump = () => {
    if (stopped) return;
    const horizon = ctx.currentTime + 0.6;
    while (next < L.events.length && start + L.events[next][0] * beat < horizon) {
      const [b, kind, a1, a2, a3] = L.events[next++];
      if (kind === 'lead' || kind === 'harm') vocalNote(ctx, voiceBus, start + b * beat, a1, a2 * beat, a3, state, S, kind === 'harm');
      else songVoice(ctx, out, kind, start + b * beat, a1, a2, beat, S);
    }
  };
  const timer = setInterval(pump, 120);
  pump();
  return handle;
}

const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ---------- The voice ---------- */
// Vowel formants for a bright young voice, a little higher than speech: [F1, F2, F3].
const VOWELS = {
  a: [880, 1380, 2950], i: [330, 2780, 3450], u: [370, 1480, 2700], e: [540, 2280, 3150], o: [540, 920, 2850], n: [290, 1150, 2650],
};

// One sung syllable: a buzzy source (two saws, a touch detuned) gliding up into the pitch
// with a quick scoop, vibrato blooming on long notes, through three formant filters that
// slide from the last vowel to this one; the consonant in front made from bursts and hiss.
function vocalNote(ctx, out, t, midi, dur, token, state, S, harm = false) {
  const tok = token || 'la';
  let vowel = tok[tok.length - 1];
  let cons = tok.slice(0, -1);
  if (tok === '-') { vowel = harm ? state.harmVowel : state.vowel; cons = ''; }
  else if (tok === 'n') { vowel = 'n'; cons = ''; }
  else if (!'aiueo'.includes(vowel)) {
    // A small tsu: the voice stops short, a catch in the throat.
    return;
  }
  const prev = harm ? state.harmVowel : state.vowel;
  if (harm) state.harmVowel = vowel; else state.vowel = vowel;
  const shift = S.teto ? 0.9 : 1.08;
  const level = harm ? 0.14 : 0.3;
  const f0 = midiHz(midi + 12) * (S.teto ? 0.5 : 1);
  const len = Math.max(0.09, dur * 0.94);
  // Consonant timing: voicing starts a hair after the beat when there's one to say first.
  const plosive = /^(k|g|t|d|p|b|ch|ts)/.test(cons);
  const fric = /^(s|sh|z|j|f|h|ts|ch)/.test(cons);
  const onset = t + (plosive ? 0.022 : fric ? 0.03 : 0);
  // Source.
  const src = ctx.createGain();
  const oscs = [0, 7].map((det, i) => { const o = ctx.createOscillator(); o.type = i ? 'square' : 'sawtooth'; o.detune.value = det; return o; });
  for (const o of oscs) {
    o.frequency.setValueAtTime(f0 * 0.965, onset);
    o.frequency.exponentialRampToValueAtTime(f0, onset + 0.05);
  }
  const vib = ctx.createOscillator(), vd = ctx.createGain();
  vib.frequency.value = 5.8 + Math.random() * 0.4;
  vd.gain.setValueAtTime(0, onset);
  vd.gain.setValueAtTime(0, onset + Math.min(0.28, len * 0.5));
  vd.gain.linearRampToValueAtTime(f0 * (len > 0.4 ? 0.014 : 0.006), onset + len);
  vib.connect(vd);
  oscs.forEach((o, i) => { vd.connect(o.frequency); const g = ctx.createGain(); g.gain.value = i ? 0.35 : 1; o.connect(g).connect(src); });
  // Breath under the voice.
  const breath = ctx.createBufferSource(); breath.buffer = Sfx.noise;
  const bg = ctx.createGain(); bg.gain.value = 0.05;
  breath.connect(bg).connect(src);
  // Formants, gliding from the last vowel (or a nasal, a "y" or a "w") into this one.
  const startF = cons === 'n' || cons === 'm' ? VOWELS.n : cons === 'y' ? VOWELS.i : cons === 'w' ? VOWELS.u : VOWELS[prev] || VOWELS.a;
  const target = VOWELS[vowel];
  const env = ctx.createGain();
  [[1, 6], [0.55, 9], [0.32, 12]].forEach(([gain, q], k) => {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(startF[k] * shift, onset);
    f.frequency.setTargetAtTime(target[k] * shift, onset + (cons === 'y' || cons === 'w' ? 0.03 : 0.005), cons === 'y' || cons === 'w' ? 0.04 : 0.025);
    const g = ctx.createGain(); g.gain.value = gain * (vowel === 'n' ? 0.6 : 1);
    src.connect(f).connect(g).connect(env);
  });
  // A little presence and air, so it cuts through like a Vocaloid.
  const air = ctx.createBiquadFilter(); air.type = 'highpass'; air.frequency.value = 3500;
  const ag = ctx.createGain(); ag.gain.value = 0.06; src.connect(air).connect(ag).connect(env);
  const nasal = cons === 'n' || cons === 'm' ? 0.45 : 1;
  env.gain.setValueAtTime(0.0001, onset);
  env.gain.exponentialRampToValueAtTime(level * nasal, onset + 0.018);
  if (nasal < 1) env.gain.linearRampToValueAtTime(level, onset + 0.06);
  // "r" is a flick: a quick dip as the tongue taps.
  if (cons === 'r') { env.gain.setValueAtTime(level * 0.35, onset + 0.012); env.gain.linearRampToValueAtTime(level, onset + 0.035); }
  env.gain.setValueAtTime(level, onset + len * 0.82);
  env.gain.exponentialRampToValueAtTime(0.0001, onset + len + 0.05);
  env.connect(out);
  const end = onset + len + 0.1;
  for (const o of [...oscs, vib]) { o.start(onset); o.stop(end); }
  breath.start(onset, Math.random()); breath.stop(end);
  // The consonant itself, on the beat.
  if (cons && !harm) consonant(ctx, out, t, cons, target, shift, level);
}

function consonant(ctx, out, t, cons, vowelF, shift, level) {
  const noise = (dur, type, freq, q, vol, at = t) => {
    const s = ctx.createBufferSource(); s.buffer = Sfx.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f).connect(g).connect(out);
    s.start(at, Math.random()); s.stop(at + dur + 0.02);
  };
  const v = level;
  if (cons === 's' || cons === 'z') noise(0.07, 'highpass', 5200, 0.8, v * 0.55);
  else if (cons === 'sh' || cons === 'j') noise(0.08, 'bandpass', 3300, 1.4, v * 0.6);
  else if (cons === 'ch') { noise(0.012, 'highpass', 3500, 0.7, v * 0.7); noise(0.06, 'bandpass', 3300, 1.4, v * 0.5, t + 0.01); }
  else if (cons === 'ts') { noise(0.012, 'highpass', 4000, 0.7, v * 0.7); noise(0.06, 'highpass', 5500, 0.8, v * 0.5, t + 0.01); }
  else if (cons === 'k' || cons === 'g') noise(0.022, 'bandpass', 2200, 1.2, v * (cons === 'k' ? 0.8 : 0.45));
  else if (cons === 't' || cons === 'd') noise(0.016, 'highpass', 3800, 0.7, v * (cons === 't' ? 0.75 : 0.4));
  else if (cons === 'p' || cons === 'b') noise(0.016, 'lowpass', 1200, 0.7, v * (cons === 'p' ? 0.8 : 0.45));
  else if (cons === 'h' || cons === 'f') noise(0.06, 'bandpass', vowelF[1] * shift, 1.5, v * 0.3);
}

// One note of one instrument, at audio time `t`.
function songVoice(ctx, out, kind, t, a1, a2, beat, S) {
  const env = (g, peak, attack, decay) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); };
  const noise = (dur) => { const s = ctx.createBufferSource(); s.buffer = Sfx.noise; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return s; };
  if (kind === 'kick') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, 0.9, 0.002, 0.28);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.32);
  } else if (kind === 'clap' || kind === 'snare') {
    const s = noise(0.2), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = kind === 'clap' ? 1500 : 2200; f.Q.value = 0.9;
    env(g, kind === 'clap' ? 0.45 : 0.18 + (a1 || 0) * 0.3, 0.002, 0.16);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'hat') {
    const s = noise(0.06), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 8000;
    env(g, 0.12 * (a1 || 0.6), 0.001, 0.045);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'crash') {
    const s = noise(1.8), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 5000;
    env(g, 0.18, 0.002, 1.6);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'riser') {
    const s = noise(a1 * beat), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + a1 * beat);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + a1 * beat); g.gain.linearRampToValueAtTime(0.0001, t + a1 * beat + 0.05);
    s.connect(f).connect(g).connect(out);
  } else if (kind === 'bass') {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = midiHz(a1);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(220, t + 0.2);
    env(g, 0.28, 0.005, a2 * beat);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + a2 * beat + 0.05);
  } else if (kind === 'saw' || kind === 'stab' || kind === 'pad') {
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = kind === 'pad' ? 1600 : 3200;
    const len = a2 * beat;
    if (kind === 'pad') { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + len * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len); }
    else env(g, kind === 'saw' ? 0.06 : 0.05, 0.02, len);
    f.connect(g).connect(out);
    for (const n of a1) for (const d of kind === 'pad' ? [-8, 8] : [-12, 0, 12]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(n); o.detune.value = d;
      o.connect(f); o.start(t); o.stop(t + len + 0.1);
    }
  } else if (kind === 'bell') {
    const g = ctx.createGain();
    env(g, 0.045, 0.003, 0.5);
    g.connect(out);
    for (const [r, v] of [[1, 1], [2.01, 0.3], [3.98, 0.12]]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = midiHz(a1) * r; og.gain.value = v; o.connect(og).connect(g); o.start(t); o.stop(t + 0.6); }
  }
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
