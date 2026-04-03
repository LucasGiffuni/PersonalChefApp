export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastInput = {
  type: ToastType;
  message: string;
  duration?: number;
};

type ToastListener = (toast: Required<ToastInput>) => void;

const listeners = new Set<ToastListener>();

export function showToast(input: ToastInput) {
  const toast: Required<ToastInput> = {
    ...input,
    duration: input.duration ?? 2400,
  };
  listeners.forEach((listener) => listener(toast));
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
