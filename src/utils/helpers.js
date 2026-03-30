export const uid = () => Math.random().toString(36).slice(2);

export function ensureWeeks(arr, fill = "A", W = 12) {
  const out = Array.isArray(arr) ? [...arr] : [];
  for (let i = 0; i < W; i++) if (typeof out[i] === "undefined") out[i] = fill;
  return out;
}
export function ensureQuizzes(arr, fill = 0, Q = 6) {
  const out = Array.isArray(arr) ? [...arr] : [];
  for (let i = 0; i < Q; i++) if (typeof out[i] === "undefined") out[i] = fill;
  return out;
}
export function defaultVisibility() {
  return {
    id: true,
    name: true,
    section: true, // <-- NEW
    att: Array.from({ length: 12 }, () => true),
    quiz: Array.from({ length: 6 }, () => true),
    comment: true,
    actions: true,
  };
}
