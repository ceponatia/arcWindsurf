declare module 'pg' {
  // Minimal typing shim to satisfy TypeScript during build.
  // The runtime dependency is provided by the `pg` package.
  export class Pool {
    constructor(config?: unknown);
    connect(): Promise<unknown>;
    query(...args: unknown[]): Promise<unknown>;
    end(): Promise<void>;
    on?(event: string, listener: (...args: unknown[]) => void): unknown;
  }
}
