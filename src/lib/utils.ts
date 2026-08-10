import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizePlainData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  try {
    return JSON.parse(
      JSON.stringify(data, (key, val) => {
        if (val && typeof val === 'object' && typeof val.seconds === 'number') {
          return new Date(val.seconds * 1000).toISOString();
        }
        return val;
      })
    );
  } catch {
    return data;
  }
}
