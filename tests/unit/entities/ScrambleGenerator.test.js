import { ScrambleGenerator } from '../../../src/domain/entities/ScrambleGenerator.js';

describe('ScrambleGenerator', () => {
  it('generates a scramble with twenty valid moves', () => {
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
});
