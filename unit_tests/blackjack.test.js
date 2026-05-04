const { calcScore, isBust, dealerShouldHit, determineWinner } = require("../backend/api/blackjack");

describe("Blackjack", () => {
  test("Ász kezelése (1 vagy 11)", () => {
    expect(calcScore(["A","9"])).toBe(20);
    expect(calcScore(["A","9","K"])).toBe(20);
  });

  test("Bust ellenőrzés", () => {
    expect(isBust(["K","Q","5"])).toBe(true);
  });

  test("Dealer húz 17 alatt", () => {
    expect(dealerShouldHit(16)).toBe(true);
    expect(dealerShouldHit(17)).toBe(false);
  });

  test("Győztes meghatározás", () => {
    expect(determineWinner(20, 18)).toBe("player");
    expect(determineWinner(18, 20)).toBe("dealer");
  });
});