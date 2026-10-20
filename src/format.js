export function normalizePhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }
  if (/^7\d{10}$/.test(digits) || /^375\d{9}$/.test(digits)) return digits;
  return null;
}

export function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^7\d{10}$/.test(digits)) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  if (/^375\d{9}$/.test(digits)) {
    return `+375 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
  }
  if (!digits) return "";
  return `+${digits}`;
}

export function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const AVATAR_COLORS = ["#e35d6a", "#e39b3a", "#3aa86a", "#3d8bfd", "#8b6adf", "#d35d9a", "#3aa0b5"];

export function colorFor(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initial(title) {
  const text = String(title || "").trim().replace(/^\+/, "");
  return text ? text.slice(0, 1).toUpperCase() : "?";
}
