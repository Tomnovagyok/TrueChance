const { isFlush, isStraight, evaluateHand } = require("../backend/api/poker");

describe("Poker", () => {
  test("Flush felismerése", () => {
    expect(isFlush(["H2","H5","H9","HJ","HK"])).toBe(true);
  });

  test("Straight felismerése", () => {
    expect(isStraight(["2","3","4","5","6"])).toBe(true);
  });

  test("Hand értékelés", () => {
    expect(evaluateHand(["H2","H5","H9","HJ","HK"])).toBe("flush");
  });
});