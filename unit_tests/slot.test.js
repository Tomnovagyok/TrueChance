const { calcWin } = require("../backend/api/slot");

describe("Slot", () => {
  test("3 azonos szimbólum nyer", () => {
    expect(calcWin(["A","A","A"])).toBeGreaterThan(0);
  });

  test("különböző szimbólum nem nyer", () => {
    expect(calcWin(["A","B","C"])).toBe(0);
  });
});