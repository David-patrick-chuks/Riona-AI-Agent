import type { Request, Response } from "express";
import { rateLimit } from "./rateLimit";

const buildReq = (ip = "1.2.3.4"): Request => ({ ip } as unknown as Request);

const buildRes = () => {
  const res: Partial<Response> & { statusCode?: number; payload?: any; headers: Record<string, string> } = {
    statusCode: undefined,
    payload: undefined,
    headers: {},
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res as Response;
  };
  res.json = (body: any) => {
    res.payload = body;
    return res as Response;
  };
  res.setHeader = (name: string, value: string) => {
    res.headers[name] = value;
    return res as Response;
  };
  return res as Response & { statusCode?: number; payload?: any; headers: Record<string, string> };
};

describe("rateLimit", () => {
  it("allows requests below the limit", () => {
    const limiter = rateLimit({ windowMs: 1000, max: 3 });
    const req = buildReq();

    let calls = 0;
    for (let i = 0; i < 3; i++) {
      const res = buildRes();
      limiter(req, res, () => {
        calls++;
      });
      expect(res.statusCode).toBeUndefined();
    }
    expect(calls).toBe(3);
  });

  it("blocks the request that exceeds the limit and returns Retry-After", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const req = buildReq("9.9.9.9");

    limiter(req, buildRes(), () => {});
    limiter(req, buildRes(), () => {});
    const res = buildRes();
    let nextCalled = false;
    limiter(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBeDefined();
    expect(res.payload?.error).toMatch(/too many/i);
  });

  it("resets after the window elapses", () => {
    const limiter = rateLimit({ windowMs: 10, max: 1 });
    const req = buildReq("5.5.5.5");
    limiter(req, buildRes(), () => {});
    const blocked = buildRes();
    limiter(req, blocked, () => {});
    expect(blocked.statusCode).toBe(429);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const after = buildRes();
        let called = false;
        limiter(req, after, () => {
          called = true;
        });
        expect(called).toBe(true);
        expect(after.statusCode).toBeUndefined();
        resolve();
      }, 25);
    });
  });

  it("separates buckets per key", () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });
    const reqA = buildReq("1.1.1.1");
    const reqB = buildReq("2.2.2.2");
    const resA = buildRes();
    const resB = buildRes();
    let calledA = false;
    let calledB = false;
    limiter(reqA, resA, () => {
      calledA = true;
    });
    limiter(reqB, resB, () => {
      calledB = true;
    });
    expect(calledA).toBe(true);
    expect(calledB).toBe(true);
  });
});
