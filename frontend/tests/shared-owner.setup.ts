/**
 * @file Registers the shared owner once per run and saves their session, so
 * specs that only need someone to create things don't each sign up. See
 * "Shared owner" in helpers.ts for which specs may use it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { test as setup } from "@playwright/test";
import {
  OWNER_INFO,
  OWNER_STATE,
  makeUsers,
  registerUser,
  type SharedOwner,
} from "./helpers.js";

setup("register the shared owner", async ({ page }) => {
  // "owner" on purpose: invitations.spec tells avatars apart by the initial "O".
  const [user] = makeUsers("owner", "owner_unused");
  const personalUrl = await registerUser(page, user);

  mkdirSync(dirname(OWNER_INFO), { recursive: true });
  await page.context().storageState({ path: OWNER_STATE });
  const info: SharedOwner = { user, personalUrl };
  writeFileSync(OWNER_INFO, JSON.stringify(info));
});
