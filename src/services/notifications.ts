import type { AppSettings, ReminderSetting } from "../types/record";
import { addMinutes, dateTimeForToday, toLocalDate } from "../utils/date";

export interface NotificationSupport {
  serviceWorker: boolean;
  notifications: boolean;
  pushManager: boolean;
  permission: NotificationPermission | "unsupported";
  canUseWebPush: boolean;
}

export function detectNotificationSupport(): NotificationSupport {
  const serviceWorker = "serviceWorker" in navigator;
  const notifications = "Notification" in window;
  const pushManager = "PushManager" in window;
  return {
    serviceWorker,
    notifications,
    pushManager,
    permission: notifications ? Notification.permission : "unsupported",
    canUseWebPush: serviceWorker && notifications && pushManager,
  };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  await registerServiceWorker();
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}

export async function subscribeToPush(reminders: ReminderSetting[]): Promise<"subscribed" | "no-server" | "unsupported"> {
  const pushServerUrl = import.meta.env.VITE_PUSH_SERVER_URL;
  if (!pushServerUrl) return "no-server";
  if (!detectNotificationSupport().canUseWebPush) return "unsupported";

  const registration = await registerServiceWorker();
  if (!registration) return "unsupported";

  const keyResponse = await fetch(`${pushServerUrl}/vapid-public-key`);
  const { publicKey } = (await keyResponse.json()) as { publicKey?: string };
  if (!publicKey) return "no-server";

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await fetch(`${pushServerUrl}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: getDeviceId(),
      subscription,
      reminders,
    }),
  });

  return "subscribed";
}

export async function sendTestPush(): Promise<"sent" | "no-server"> {
  const pushServerUrl = import.meta.env.VITE_PUSH_SERVER_URL;
  if (!pushServerUrl) return "no-server";
  await fetch(`${pushServerUrl}/send-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: getDeviceId() }),
  });
  return "sent";
}

export function findDueReminder(settings: AppSettings): ReminderSetting | null {
  const today = toLocalDate();
  const now = new Date();

  return (
    settings.reminders.find((reminder) => {
      if (!reminder.enabled) return false;
      if (reminder.skippedDate === today || reminder.dismissedDate === today) return false;
      if (reminder.snoozeUntil) return new Date(reminder.snoozeUntil) <= now;
      const dueAt = dateTimeForToday(reminder.time, today);
      if (dueAt.getHours() < 4 && now.getHours() >= 4) dueAt.setDate(dueAt.getDate() + 1);
      return dueAt <= now;
    }) ?? null
  );
}

export function snoozeReminder(reminder: ReminderSetting, minutes: number): ReminderSetting {
  return { ...reminder, snoozeUntil: addMinutes(new Date(), minutes).toISOString() };
}

export function skipReminderToday(reminder: ReminderSetting): ReminderSetting {
  return { ...reminder, skippedDate: toLocalDate(), snoozeUntil: undefined };
}

export function dismissReminderToday(reminder: ReminderSetting): ReminderSetting {
  return { ...reminder, dismissedDate: toLocalDate(), snoozeUntil: undefined };
}

export function buildIcs(settings: AppSettings): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Self Trace Daily//Reminders//CN"];
  const today = new Date();
  const stamp = today.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  for (const reminder of settings.reminders.filter((item) => item.enabled)) {
    const [hour, minute] = reminder.time.split(":");
    const start = new Date();
    start.setHours(Number(hour), Number(minute), 0, 0);
    const dtStart = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    lines.push(
      "BEGIN:VEVENT",
      `UID:self-trace-${reminder.key}@local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      "RRULE:FREQ=DAILY",
      `SUMMARY:${escapeIcs(reminder.label)}`,
      `DESCRIPTION:${escapeIcs(reminder.message)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(settings: AppSettings): void {
  const blob = new Blob([buildIcs(settings)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "self-trace-reminders.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

export function getDeviceId(): string {
  const existing = localStorage.getItem("self-trace-device-id");
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem("self-trace-device-id", id);
  return id;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }
  return outputArray.buffer as ArrayBuffer;
}
