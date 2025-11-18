import { prisma, resolvedDbUrl, resolvedDbPath } from './prisma.js';
import { Prisma as PrismaNs } from '@prisma/client';
import { access } from 'node:fs/promises';

export interface DbColumn {
  name: string;
  type: string;
  isId: boolean;
  isRequired: boolean;
  isList: boolean;
}

export type DbRow = Record<string, unknown>;

export interface DbTableOverview {
  name: string;
  columns: DbColumn[];
  rowCount: number;
  sample: DbRow[];
}

export async function getDbOverview(): Promise<{ tables: DbTableOverview[] }> {
  const models = PrismaNs.dmmf.datamodel.models;

  const results: DbTableOverview[] = [];

  for (const m of models) {
    const name = m.name;

    const columns: DbColumn[] = m.fields.map((f) => ({
      name: f.name,
      type: typeof f.type === 'string' ? String(f.type) : 'object',
      isId: !!f.isId,
      isRequired: !!f.isRequired,
      isList: !!f.isList,
    }));

    const delegateName = name.charAt(0).toLowerCase() + name.slice(1);

    // Narrow dynamic delegate access to a safe shape
    const delegateMap = prisma as unknown as Record<
      string,
      {
        count?: () => Promise<number>;
        findMany?: (args: { take?: number; orderBy?: unknown }) => Promise<DbRow[]>;
      }
    >;

    const delegate = delegateMap[delegateName];

    let rowCount = 0;
    let sample: DbRow[] = [];

    if (delegate) {
      try {
        rowCount = typeof delegate.count === 'function' ? await delegate.count() : 0;
      } catch {
        // ignore count failure
      }

      try {
        const orderBy = m.fields.some((f) => f.name === 'createdAt')
          ? { createdAt: 'desc' as const }
          : undefined;

        sample =
          typeof delegate.findMany === 'function'
            ? await delegate.findMany({ take: 50, orderBy })
            : [];
      } catch {
        // ignore sample failure
      }
    }

    results.push({ name, columns, rowCount, sample });
  }

  return { tables: results };
}

export async function getDbPathInfo() {
  let exists = false;
  try {
    await access(resolvedDbPath);
    exists = true;
  } catch {
    // file doesn't exist or not accessible
  }

  return { url: resolvedDbUrl, path: resolvedDbPath, exists };
}

export async function deleteDbRow(modelName: string, id: string): Promise<void> {
  const models = PrismaNs.dmmf.datamodel.models;
  const model = models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());

  if (!model) {
    throw new Error('Unknown model');
  }

  const idFields = model.fields.filter((f) => f.isId);
  if (idFields.length !== 1 || idFields[0]?.name !== 'id') {
    throw new Error('Delete only supported for single id primary key named "id"');
  }

  const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

  const delegateMap = prisma as unknown as Record<
    string,
    { delete?: (args: { where: { id: string } }) => Promise<unknown> }
  >;

  const delegate = delegateMap[delegateName];

  if (!(delegate && typeof delegate.delete === 'function')) {
    throw new Error('Delete not supported for model');
  }

  try {
    await delegate.delete({ where: { id } });
  } catch (err: unknown) {
    const msg =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message)
        : String(err);

    if (/Record to delete does not exist/i.test(msg)) {
      throw new Error('Not found');
    }

    throw err;
  }
}
