const { canClaimDaily } = require("../backend/api/daily-cash");

describe("Stats / Daily", () => {
  test("Nem kap kétszer napi jutalmat", () => {
    const user = { lastClaim: Date.now() };
    expect(canClaimDaily(user)).toBe(false);
  });
});