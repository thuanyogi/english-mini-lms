import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentLearner = vi.fn();
vi.mock("@/server/auth", () => ({ getCurrentLearner: () => getCurrentLearner() }));

import { guardAdmin } from "@/server/admin/admin-guard";
import * as activitiesRoute from "@/app/api/v1/admin/content/activities/route";
import * as activityIdRoute from "@/app/api/v1/admin/content/activities/[id]/route";
import * as sourcesRoute from "@/app/api/v1/admin/content/sources/route";
import * as sourceIdRoute from "@/app/api/v1/admin/content/sources/[id]/route";
import * as segmentsRoute from "@/app/api/v1/admin/content/segments/route";
import * as segmentIdRoute from "@/app/api/v1/admin/content/segments/[id]/route";

const jsonReq = (method: string, body: unknown = {}) =>
  new Request("http://localhost/api/v1/admin/content/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const ctx = { params: Promise.resolve({ id: "W1" }) };

describe("API quản lý nội dung — chỉ admin", () => {
  beforeEach(() => getCurrentLearner.mockReset());

  it("guardAdmin: chưa đăng nhập → 401, learner → 403, admin → null", async () => {
    getCurrentLearner.mockResolvedValue(null);
    expect((await guardAdmin())?.status).toBe(401);
    getCurrentLearner.mockResolvedValue({ role: "learner" });
    expect((await guardAdmin())?.status).toBe(403);
    getCurrentLearner.mockResolvedValue({ role: "admin" });
    expect(await guardAdmin()).toBeNull();
  });

  it("mọi route trả 403 cho non-admin (GET/POST/PATCH)", async () => {
    getCurrentLearner.mockResolvedValue({ role: "learner" });
    const results = await Promise.all([
      activitiesRoute.GET(new Request("http://localhost/x?state=all")),
      activitiesRoute.POST(jsonReq("POST")),
      activityIdRoute.PATCH(jsonReq("PATCH"), ctx),
      sourcesRoute.GET(new Request("http://localhost/x")),
      sourcesRoute.POST(jsonReq("POST")),
      sourceIdRoute.PATCH(jsonReq("PATCH"), ctx),
      segmentsRoute.GET(),
      segmentsRoute.POST(jsonReq("POST")),
      segmentIdRoute.PATCH(jsonReq("PATCH"), ctx),
    ]);
    for (const res of results) expect(res.status).toBe(403);
  });

  it("KHÔNG route nào export DELETE/PUT (không cho xoá vật lý)", () => {
    for (const mod of [activitiesRoute, activityIdRoute, sourcesRoute, sourceIdRoute, segmentsRoute, segmentIdRoute]) {
      expect(Object.keys(mod)).not.toContain("DELETE");
      expect(Object.keys(mod)).not.toContain("PUT");
    }
  });

  it("admin gửi dữ liệu sai → 422 kèm details theo field (chưa chạm DB)", async () => {
    getCurrentLearner.mockResolvedValue({ role: "admin" });
    const res = await activitiesRoute.POST(jsonReq("POST", { id: "X1", mode: "bad", title: "" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(["id", "mode"])
    );
  });

  it("GET state không hợp lệ → 422", async () => {
    getCurrentLearner.mockResolvedValue({ role: "admin" });
    const res = await activitiesRoute.GET(new Request("http://localhost/x?state=deleted"));
    expect(res.status).toBe(422);
  });
});
