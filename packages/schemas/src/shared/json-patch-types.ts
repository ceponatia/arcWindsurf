export type JsonPatchOperationOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

export interface JsonPatchOperation {
  op: JsonPatchOperationOp;
  path: string;
  from?: string;
  value?: unknown;
}
