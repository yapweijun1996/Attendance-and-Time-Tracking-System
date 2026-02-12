const DEVICE_ID_KEY = "satts_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "dev_server";
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = `dev_${crypto.randomUUID().slice(0, 8)}`;
  window.localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}
