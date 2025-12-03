export const splitList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
