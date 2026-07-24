import { ScrambleGenerator } from '../../../src/domain/entities/ScrambleGenerator.js';

describe('ScrambleGenerator', () => {
  it('generates a 3x3 scramble with twenty valid moves by default', () => {
    const values = [
      0.00, 0.00,
      0.35, 0.50,
      0.80, 0.99,
      0.10, 0.20,
      0.60, 0.70,
      0.95, 0.40,
      0.15, 0.80,
      0.55, 0.10,
      0.85, 0.60,
      0.25, 0.30,
      0.75, 0.90,
      0.05, 0.50,
      0.45, 0.20,
      0.90, 0.70,
      0.12, 0.10,
      0.62, 0.30,
      0.98, 0.90,
      0.22, 0.60,
      0.72, 0.40,
      0.32, 0.80,
    ];
    let index = 0;
    const generator = new ScrambleGenerator({
      random: () => values[index++ % values.length],
    });

    const scramble = generator.generate();
    const moves = scramble.split(' ');

    expect(moves).toHaveLength(20);
    expect(moves).toEqual(expect.arrayContaining([
      expect.stringMatching(/^[UDLRFB]('?|2)?$/),
    ]));
  });

  it('generates shorter 2x2 scrambles', () => {
    const generator = new ScrambleGenerator({ random: () => 0.1 });

    const moves = generator.generate('2x2').split(' ');

    expect(moves).toHaveLength(11);
    expect(moves).toEqual(expect.arrayContaining([
      expect.stringMatching(/^[UDLRFB]('?|2)?$/),
    ]));
  });

  it('generates long big-cube scrambles with wide moves', () => {
    const values = [0.99, 0.5, 0.1, 0.2, 0.8, 0.7];
    let index = 0;
    const generator = new ScrambleGenerator({ random: () => values[index++ % values.length] });

    const moves = generator.generate('5x5').split(' ');

    expect(moves).toHaveLength(60);
    expect(moves.some((move) => move.includes('w'))).toBe(true);
  });

  it('generates pyraminx notation with tips', () => {
    const values = [0.99, 0.5, 0.1, 0.2, 0.8, 0.7];
    let index = 0;
    const generator = new ScrambleGenerator({ random: () => values[index++ % values.length] });

    const moves = generator.generate('pyraminx').split(' ');

    expect(moves).toHaveLength(11);
    expect(moves.some((move) => /^[ulrb]'?$/.test(move))).toBe(true);
  });

  it('generates megaminx notation with double-turn style moves', () => {
    const values = [0.0, 0.0, 0.5, 0.5, 0.99, 0.0, 0.2, 0.7];
    let index = 0;
    const generator = new ScrambleGenerator({ random: () => values[index++ % values.length] });

    const moves = generator.generate('megaminx').split(' ');

    expect(moves).toHaveLength(70);
    expect(moves).toEqual(expect.arrayContaining([
      expect.stringMatching(/^(R|D)(\+\+|--)$/),
    ]));
    expect(moves).toEqual(expect.arrayContaining([
      expect.stringMatching(/^U'?$/),
    ]));
  });

  it('generates FTO notation with octahedron faces', () => {
    const values = [0.0, 0.0, 0.5, 0.5, 0.99, 0.0, 0.2, 0.7];
    let index = 0;
    const generator = new ScrambleGenerator({ random: () => values[index++ % values.length] });

    const moves = generator.generate('fto').split(' ');

    expect(moves).toHaveLength(35);
    expect(moves).toEqual(expect.arrayContaining([
      expect.stringMatching(/^(U|D|R|L|F|B|BR|BL)'?$/),
    ]));
  });
});
