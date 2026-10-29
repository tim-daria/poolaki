/**
 * @file Registers the shared owner once per run and saves their session, so
 * specs that only need someone to create things don't each sign up. See
 * "Shared owner" in helpers.ts for which specs may use it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { test as setup } from "@playwright/test";
import {
  makeUsers,
  ownerInfo,
  ownerState,
  registerUser,
  type SharedOwner,
} from "./helpers.js";

setup("register the shared owner", async ({ page, browserName }) => {
  // "owner" on purpose: invitations.spec tells avatars apart by the initial "O".
  const [user] = makeUsers("owner", "owner_unused");
  const personalUrl = await registerUser(page, user);

  const infoPath = ownerInfo(browserName);
  mkdirSync(dirname(infoPath), { recursive: true });
  await page.context().storageState({ path: ownerState(browserName) });
  const info: SharedOwner = { user, personalUrl };
  writeFileSync(infoPath, JSON.stringify(info));
});
