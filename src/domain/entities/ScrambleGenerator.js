const MOVES = [
  { face: 'U', axis: 'y' },
  { face: 'D', axis: 'y' },
  { face: 'R', axis: 'x' },
  { face: 'L', axis: 'x' },
  { face: 'F', axis: 'z' },
  { face: 'B', axis: 'z' },
];

const MODIFIERS = ['', '\'', '2'];
const DEFAULT_LENGTH = 20;

function pickRandom(items, random) {
  return items[Math.floor(random() * items.length)];
}

export class ScrambleGenerator {
  constructor({ random = Math.random, length = DEFAULT_LENGTH } = {}) {
    this.random = random;
    this.length = length;
  }

  generate() {
    const moves = [];
    let previousFace = null;
    let previousAxis = null;

    while (moves.length < this.length) {
      const candidates = MOVES.filter((move) =>
        move.face !== previousFace && move.axis !== previousAxis);
      const move = pickRandom(candidates, this.random);
      const modifier = pickRandom(MODIFIERS, this.random);

      moves.push(`${move.face}${modifier}`);
      previousFace = move.face;
      previousAxis = move.axis;
    }

    return moves.join(' ');
  }
}
