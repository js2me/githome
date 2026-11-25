import { QueryClient } from "@tanstack/query-core";
import { afterEach, expect, it, vi } from "vitest";
import { connectionProfileOptions } from "./connection-profile-query";

afterEach(() => vi.unstubAllGlobals());

it("shares the profile query per account and isolates a late response after token rotation", async () => {
  const client = new QueryClient();
  const original = { id: "work", gitlabUrl: "https://gitlab.example", gitToken: "first-token" };
  const second = { ...original, id: "personal", gitToken: "second-token" };
  const rotated = { ...original, gitToken: "third-token", credentialsRevision: "updated" };
  const delayed = Promise.withResolvers<Response>();
  const request = vi.fn(async (_url: RequestInfo | URL, init: RequestInit) => {
    const token = new Headers(init.headers).get("PRIVATE-TOKEN");
    if (token === original.gitToken) return delayed.promise;
    const name = token === second.gitToken ? "Personal" : "Updated";
    return Response.json({ id: 2, name, username: name.toLowerCase(), email: "unused" });
  });
  vi.stubGlobal("fetch", request);

  const previous = client.fetchQuery(connectionProfileOptions(original));
  const currentOptions = connectionProfileOptions(rotated);
  const personal = await client.fetchQuery(connectionProfileOptions(second));
  const current = await client.fetchQuery(currentOptions);
  await client.fetchQuery(connectionProfileOptions({ ...rotated }));
  delayed.resolve(Response.json({ id: 1, name: "Old", username: "old" }));
  await previous;

  expect(personal.name).toBe("Personal");
  expect(current.name).toBe("Updated");
  expect(current).not.toHaveProperty("email");
  expect(client.getQueryData(currentOptions.queryKey)).toEqual(current);
  expect(request).toHaveBeenCalledTimes(3);
  const keys = JSON.stringify(client.getQueryCache().getAll().map((query) => query.queryKey));
  for (const connection of [original, second, rotated]) {
    expect(keys).not.toContain(connection.gitToken);
  }
  client.clear();
});
