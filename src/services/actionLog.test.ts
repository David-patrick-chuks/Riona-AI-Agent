import fs from "fs/promises";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import { getActionSummary, listActionLogs, logAction } from "./actionLog";

describe("action log service", () => {
  const originalPath = process.env.ACTION_LOG_PATH;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "riona-action-log-"));
    process.env.ACTION_LOG_PATH = path.join(tempDir, "actionLogs.json");
  });

  afterEach(async () => {
    process.env.ACTION_LOG_PATH = originalPath;
    await mongoose.disconnect();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("writes and reads action logs from file fallback", async () => {
    await logAction({
      platform: "instagram",
      action: "login",
      status: "success",
      account: "default",
      username: "riona",
    });

    const entries = await listActionLogs({ limit: 10 });
    expect(entries).toHaveLength(1);
    expect(entries[0].platform).toBe("instagram");
    expect(entries[0].action).toBe("login");
    expect(entries[0].status).toBe("success");
  });

  test("summarizes recent actions", async () => {
    await logAction({
      platform: "instagram",
      action: "login",
      status: "success",
      account: "default",
    });
    await logAction({
      platform: "instagram",
      action: "interact",
      status: "error",
      account: "default",
      error: "challenge required",
    });

    const summary = await getActionSummary({ limit: 10 });
    expect(summary.total).toBe(2);
    expect(summary.success).toBe(1);
    expect(summary.error).toBe(1);
    expect(summary.byAction.login).toBe(1);
    expect(summary.byAction.interact).toBe(1);
  });
});
