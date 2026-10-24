"use client";

// App-wide status messages shown in the navbar pill (replaces Sonner toasts).
// Same call shape as before: toast.success("Saved"), toast.error(message).
export type NoticeKind = "success" | "error" | "info";
export type Notice = { id: number; kind: NoticeKind; message: string };
type Options = { id?: string; duration?: number; description?: string };

const DURATION: Record<NoticeKind, number> = {
  success: 2200,
  info: 2600,
  error: 5000,
};

let current: Notice | null = null;
// Last message shown, kept so the pill can fade it out after dismissal
let last: Notice | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function show(kind: NoticeKind, message: string, options?: Options) {
  clearTimeout(timer);
  const text = options?.description
    ? `${message} · ${options.description}`
    : message;
  current = { id: ++seq, kind, message: text };
  last = current;
  emit();
  timer = setTimeout(dismissNotice, options?.duration ?? DURATION[kind]);
}

export function dismissNotice() {
  clearTimeout(timer);
  current = null;
  emit();
}

export function subscribeNotice(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotice() {
  return current;
}

export function getLastNotice() {
  return last;
}

export const toast = {
  success: (message: string, options?: Options) =>
    show("success", message, options),
  error: (message: string, options?: Options) =>
    show("error", message, options),
  info: (message: string, options?: Options) => show("info", message, options),
};
