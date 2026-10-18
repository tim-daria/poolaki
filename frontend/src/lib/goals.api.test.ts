/** @file Goal fetchers: request shape, response unwrapping and rejection handling. */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GoalError, createGoal, getGoals, updateGoal } from "./goals";

const ORG = 7;
const TOKEN = "csrf";

/** One goal as the serializer sends it. */
const DTO = {
  id: 1,
  org: ORG,
  name: "Trip",
  target_amount: "2000.00",
  target_date: "2026-12-31",
  status: "active",
  created_by: "owner",
  created_at: "2026-08-01T00:00:00Z",
  completed_at: null,
  balance: "1790.00",
  progress: "0.90",
  overdue: false,
  spendable: false,
};

function stubFetch(body: unknown, status = 200) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("getGoals", () => {
  it("unwraps the goals array and parses the money strings", async () => {
    const fetchSpy = stubFetch({ goals: [DTO], total: 1 });
    const goals = await getGoals(ORG);
    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/v1/organizations/${ORG}/goals/`,
      expect.objectContaining({ credentials: "include" }),
    );
    expect(goals).toEqual([
      expect.objectContaining({
        id: 1,
        target_amount: 2000,
        balance: 1790,
        progress: 0.9,
        status: "active",
      }),
    ]);
  });

  it("throws on a failed load", async () => {
    stubFetch({}, 500);
    await expect(getGoals(ORG)).rejects.toThrow("Failed to load goals (500)");
  });
});

describe("createGoal", () => {
  it("posts a null date when the field is empty and returns the bare goal", async () => {
    const fetchSpy = stubFetch({ ...DTO, target_date: null }, 201);
    const goal = await createGoal(
      ORG,
      { name: " Trip ", target_amount: "2000", target_date: "" },
      TOKEN,
    );
    const [, init] = fetchSpy.mock.calls[0];
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Trip",
      target_amount: "2000.00",
      target_date: null,
    });
    expect(goal.target_date).toBeNull();
  });

  it("turns a 400 into a GoalError with the server's message", async () => {
    stubFetch(
      { name: ["A goal with this name already exists in this workspace."] },
      400,
    );
    stubFetch({ name: [""] }, 400);
    await expect(
      createGoal(
        ORG,
        { name: "Trip", target_amount: "1", target_date: "" },
        TOKEN,
      ),
    ).rejects.toThrow(GoalError);
  });
});

describe("updateGoal", () => {
  it("patches exactly the given fields and unwraps the goal", async () => {
    const fetchSpy = stubFetch({ goal: { ...DTO, status: "completed" } });
    const goal = await updateGoal(ORG, 1, { status: "completed" }, TOKEN);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`/api/v1/organizations/${ORG}/goals/1/`);
    expect(init).toMatchObject({
      method: "PATCH",
      headers: expect.objectContaining({ "X-CSRFToken": TOKEN }),
    });
    expect(JSON.parse(String(init?.body))).toEqual({ status: "completed" });
    expect(goal.status).toBe("completed");
  });

  it("turns a 403 into a GoalError carrying the detail", async () => {
    const detail =
      "Only the organization owner and the goal creator can update this goal.";
    stubFetch({ detail }, 403);
    await expect(updateGoal(ORG, 1, { name: "Other" }, TOKEN)).rejects.toThrow(
      detail,
    );
  });

  it("throws on any other failure", async () => {
    stubFetch({}, 500);
    await expect(updateGoal(ORG, 1, { name: "Other" }, TOKEN)).rejects.toThrow(
      "Failed to update goal (500)",
    );
  });
});
