import cors from "cors";
import "dotenv/config";
import express from "express";
import cron from "node-cron";
import webPush from "web-push";

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "1mb" }));

const subscriptions = new Map();

if (process.env.PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY && process.env.VAPID_SUBJECT) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY,
  );
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, subscriptions: subscriptions.size });
});

app.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.PUBLIC_VAPID_KEY || "" });
});

app.post("/subscriptions", (req, res) => {
  const { deviceId, subscription, reminders } = req.body || {};
  if (!deviceId || !subscription) {
    res.status(400).json({ error: "deviceId and subscription are required" });
    return;
  }
  subscriptions.set(deviceId, { subscription, reminders: reminders || [] });
  res.json({ ok: true });
});

app.post("/send-test", async (req, res) => {
  const { deviceId } = req.body || {};
  const target = subscriptions.get(deviceId);
  if (!target) {
    res.status(404).json({ error: "subscription not found" });
    return;
  }
  await sendPush(target.subscription, {
    title: "自我追溯",
    body: "这是一条测试提醒。漏记没关系，现在补一下也可以。",
    url: "/",
  });
  res.json({ ok: true });
});

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mm = `${now.getMinutes()}`.padStart(2, "0");
  const current = `${hh}:${mm}`;

  for (const target of subscriptions.values()) {
    for (const reminder of target.reminders || []) {
      if (!reminder.enabled || reminder.time !== current) continue;
      await sendPush(target.subscription, {
        title: reminder.label || "自我追溯",
        body: reminder.message || "可以顺手记录一下现在的状态。",
        url: "/",
      });
    }
  }
});

async function sendPush(subscription, payload) {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error("push failed", error?.statusCode || "", error?.message || error);
  }
}

app.listen(port, () => {
  console.log(`Push server listening on http://localhost:${port}`);
});
