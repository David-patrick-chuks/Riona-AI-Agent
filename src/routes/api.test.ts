import type { Server } from "http";
import type { AddressInfo } from "net";

import app from "../app";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("public API routes", () => {
  it("GET /api/status returns dbConnected boolean", async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.dbConnected).toBe("boolean");
  });

  it("GET /api/health exposes the expected shape", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("dbConnected");
    expect(body).toHaveProperty("geminiKeys");
    expect(body).toHaveProperty("igClient");
  });

  it("GET /api/me without a token returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/me`);
    expect(res.status).toBe(401);
  });

  it("POST /api/login without credentials returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("POST /api/login enforces the rate limit", async () => {
    let blocked = false;
    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.42" },
        body: JSON.stringify({}),
      });
      if (res.status === 429) {
        blocked = true;
        expect(res.headers.get("retry-after")).not.toBeNull();
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it("GET /dashboard serves the HTML shell", async () => {
    const res = await fetch(`${baseUrl}/dashboard`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const text = await res.text();
    expect(text).toContain("Riona Dashboard");
  });
});
