const { isWin, calculatePayout } = require("../backend/api/roulette");

describe("Roulette", () => {
  test("Piros nyer", () => {
    expect(isWin("red", 7)).toBe(true);
  });

  test("Fekete veszít", () => {
    expect(isWin("black", 7)).toBe(false);
  });

  test("Kifizetés számítás", () => {
    expect(calculatePayout("number", 10)).toBeGreaterThan(10);
  });
});