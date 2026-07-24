const CUBE_MOVES = [
  { face: 'U', axis: 'y' },
  { face: 'D', axis: 'y' },
  { face: 'R', axis: 'x' },
  { face: 'L', axis: 'x' },
  { face: 'F', axis: 'z' },
  { face: 'B', axis: 'z' },
];

const DEFAULT_MODIFIERS = ['', '\'', '2'];

const EVENT_CONFIG = {
  '2x2': {
    length: 11,
    moves: CUBE_MOVES,
    modifiers: DEFAULT_MODIFIERS,
  },
  '3x3': {
    length: 20,
    moves: CUBE_MOVES,
    modifiers: DEFAULT_MODIFIERS,
  },
  '4x4': {
    length: 40,
    moves: [
      ...CUBE_MOVES,
      { face: 'Uw', axis: 'y' },
      { face: 'Rw', axis: 'x' },
      { face: 'Fw', axis: 'z' },
    ],
    modifiers: DEFAULT_MODIFIERS,
  },
  '5x5': {
    length: 60,
    moves: [
      ...CUBE_MOVES,
      { face: 'Uw', axis: 'y' },
      { face: 'Dw', axis: 'y' },
      { face: 'Rw', axis: 'x' },
      { face: 'Lw', axis: 'x' },
      { face: 'Fw', axis: 'z' },
      { face: 'Bw', axis: 'z' },
    ],
    modifiers: DEFAULT_MODIFIERS,
  },
  '6x6': {
    length: 80,
    moves: [
      ...CUBE_MOVES,
      { face: 'Uw', axis: 'y' },
      { face: 'Dw', axis: 'y' },
      { face: 'Rw', axis: 'x' },
      { face: 'Lw', axis: 'x' },
      { face: 'Fw', axis: 'z' },
      { face: 'Bw', axis: 'z' },
      { face: '3Uw', axis: 'y' },
      { face: '3Rw', axis: 'x' },
      { face: '3Fw', axis: 'z' },
    ],
    modifiers: DEFAULT_MODIFIERS,
  },
  '7x7': {
    length: 100,
    moves: [
      ...CUBE_MOVES,
      { face: 'Uw', axis: 'y' },
      { face: 'Dw', axis: 'y' },
      { face: 'Rw', axis: 'x' },
      { face: 'Lw', axis: 'x' },
      { face: 'Fw', axis: 'z' },
      { face: 'Bw', axis: 'z' },
      { face: '3Uw', axis: 'y' },
      { face: '3Dw', axis: 'y' },
      { face: '3Rw', axis: 'x' },
      { face: '3Lw', axis: 'x' },
      { face: '3Fw', axis: 'z' },
      { face: '3Bw', axis: 'z' },
    ],
    modifiers: DEFAULT_MODIFIERS,
  },
  oh: {
    length: 20,
    moves: CUBE_MOVES,
    modifiers: DEFAULT_MODIFIERS,
  },
  pyraminx: {
    length: 11,
    moves: [
      { face: 'U', axis: 'u' },
      { face: 'L', axis: 'l' },
      { face: 'R', axis: 'r' },
      { face: 'B', axis: 'b' },
      { face: 'u', axis: 'tu' },
      { face: 'l', axis: 'tl' },
      { face: 'r', axis: 'tr' },
      { face: 'b', axis: 'tb' },
    ],
    modifiers: ['', '\''],
  },
  skewb: {
    length: 11,
    moves: [
      { face: 'U', axis: 'u' },
      { face: 'R', axis: 'r' },
      { face: 'L', axis: 'l' },
      { face: 'B', axis: 'b' },
    ],
    modifiers: ['', '\''],
  },
  megaminx: {
    length: 70,
    moves: [
      { face: 'R', axis: 'r', modifiers: ['++', '--'] },
      { face: 'D', axis: 'd', modifiers: ['++', '--'] },
      { face: 'U', axis: 'u', modifiers: ['', '\''] },
    ],
    modifiers: ['', '\''],
  },
  fto: {
    length: 35,
    moves: [
      { face: 'U', axis: 'u' },
      { face: 'D', axis: 'd' },
      { face: 'R', axis: 'r' },
      { face: 'L', axis: 'l' },
      { face: 'F', axis: 'f' },
      { face: 'B', axis: 'b' },
      { face: 'BR', axis: 'br' },
      { face: 'BL', axis: 'bl' },
    ],
    modifiers: ['', '\''],
  },
};

const DEFAULT_EVENT = '3x3';

function pickRandom(items, random) {
  return items[Math.floor(random() * items.length)];
}

export class ScrambleGenerator {
  constructor({ random = Math.random, length = null } = {}) {
    this.random = random;
    this.length = length;
  }

  generate(event = DEFAULT_EVENT) {
    const config = EVENT_CONFIG[event] ?? EVENT_CONFIG[DEFAULT_EVENT];
    const movesConfig = config.moves;
    const modifiers = config.modifiers;
    const length = this.length ?? config.length;
    const moves = [];
    let previousFace = null;
    let previousAxis = null;

    while (moves.length < length) {
      const candidates = movesConfig.filter((move) =>
        move.face !== previousFace && move.axis !== previousAxis);
      const move = pickRandom(candidates, this.random);
      const modifier = pickRandom(move.modifiers ?? modifiers, this.random);

      moves.push(`${move.face}${modifier}`);
      previousFace = move.face;
      previousAxis = move.axis;
    }

    return moves.join(' ');
  }
}
