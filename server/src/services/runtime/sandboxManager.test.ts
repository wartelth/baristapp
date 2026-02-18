import test from "node:test";
import assert from "node:assert/strict";
import { deployMiniAppToSandbox } from "./sandboxManager";

test("sandbox deploy uses local free mode when Daytona is not configured", async () => {
  const oldUrl = process.env.DAYTONA_API_URL;
  const oldKey = process.env.DAYTONA_API_KEY;
  delete process.env.DAYTONA_API_URL;
  delete process.env.DAYTONA_API_KEY;

  const result = await deployMiniAppToSandbox(
    "app-test",
    "version-test",
    {
      appId: "app-test",
      title: "Test",
      icon: "🧪",
      version: 2,
      initialState: {},
      screens: [{ id: "main", title: "Main", components: [] }],
    } as any
  );

  assert.equal(result.status, "deployed");
  assert.equal(result.provider, "local");

  process.env.DAYTONA_API_URL = oldUrl;
  process.env.DAYTONA_API_KEY = oldKey;
});
