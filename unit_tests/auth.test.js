const { login } = require("../backend/api/auth");

describe("Auth", () => {
  test("rossz jelszó elutasítva", async () => {
    const result = await login("user", "wrong");
    expect(result).toBeFalsy();
  });
});