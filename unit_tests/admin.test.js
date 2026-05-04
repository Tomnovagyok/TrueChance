const { updateBalance, isAdmin } = require("../backend/api/admin");

describe("Admin", () => {
  test("Admin tud pénzt adni", () => {
    const user = { balance: 100 };
    const result = updateBalance(user, 100);
    expect(result.balance).toBe(200);
  });

  test("Nem admin nem módosíthat", () => {
    const user = { role: "user" };
    expect(isAdmin(user)).toBe(false);
  });
});