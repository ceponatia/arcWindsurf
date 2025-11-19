import React, { useEffect, useRef, useState } from 'react';
import {
  getDbOverview,
  deleteDbRow,
  type DbOverview,
  type DbTableOverview,
} from '../api/client.js';
import { DB_TOOLS } from '../config.js';

function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return `${v}`;
  try {
    return (v as { toString: () => string }).toString();
  } catch {
    return '';
  }
}

// DB row type with common id variants plus index signature
interface DbRow {
  id?: unknown;
  ID?: unknown;
  Id?: unknown;
  [key: string]: unknown;
}

export const DbView: React.FC = () => {
  const [data, setData] = useState<DbOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reload = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    return getDbOverview(signal)
      .then((d) => setData(d))
      .catch((e) => setError((e as Error).message || 'Failed to load DB overview'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void reload(ctrl.signal);
    return () => abortRef.current?.abort();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4">
        <h2 className="text-lg font-semibold">Database</h2>
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4">
        <h2 className="text-lg font-semibold">Database</h2>
        <p className="text-red-400">{error}</p>
      </div>
    );
  if (!data) return null;

  const TableCard: React.FC<{ table: DbTableOverview }> = ({ table }) => {
    const sampleRows = table.sample ?? [];
    const columns: string[] = sampleRows.length
      ? Object.keys(sampleRows[0]!)
      : table.columns.map((c) => c.name);

    return (
      <div className="border border-slate-800 rounded-lg mb-4 bg-slate-950">
        <div className="px-4 py-3 border-b border-slate-800">
          <h3 className="m-0 text-base font-semibold text-slate-100">
            {table.name}{' '}
            {typeof table.rowCount === 'number' ? (
              <span className="text-slate-500 font-normal">({table.rowCount} rows)</span>
            ) : null}
          </h3>
        </div>
        <div className="flex flex-wrap gap-6 p-4">
          <div className="min-w-[280px]">
            <h4 className="mb-2 text-sm text-slate-300">Columns</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-slate-400 uppercase">
                  <th className="text-left px-2 py-1">name</th>
                  <th className="text-left px-2 py-1">type</th>
                  <th className="text-left px-2 py-1">id</th>
                  <th className="text-left px-2 py-1">required</th>
                  <th className="text-left px-2 py-1">list</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((c) => (
                  <tr key={c.name} className="border-b border-slate-800 hover:bg-slate-900/50">
                    <td className="px-2 py-1">{c.name}</td>
                    <td className="px-2 py-1">{c.type}</td>
                    <td className="px-2 py-1">{c.isId ? 'yes' : 'no'}</td>
                    <td className="px-2 py-1">{c.isRequired ? 'yes' : 'no'}</td>
                    <td className="px-2 py-1">{c.isList ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex-1 min-w-[420px]">
            <h4 className="mb-2 text-sm text-slate-300">Recent Rows</h4>
            <div className="overflow-x-auto">
              {sampleRows.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400 uppercase">
                      {columns.map((k) => (
                        <th key={k} className="text-left px-2 py-1">
                          {k}
                        </th>
                      ))}
                      {DB_TOOLS ? <th className="text-left px-2 py-1">actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row: unknown, i: number) => {
                      const rec = row as DbRow;
                      const idVal = rec.id ?? rec.ID ?? rec.Id ?? rec[columns[0]!]; // best-effort fallback
                      const idStr =
                        typeof idVal === 'string' || typeof idVal === 'number'
                          ? String(idVal)
                          : undefined;

                      return (
                        <tr key={i} className="border-b border-slate-800 hover:bg-slate-900/50">
                          {columns.map((k) => {
                            const val = rec[k];
                            const display = toDisplay(val);
                            return (
                              <td key={k} className="px-2 py-1 align-top">
                                {display}
                              </td>
                            );
                          })}
                          {DB_TOOLS ? (
                            <td className="px-2 py-1">
                              <button
                                className={`px-2 py-1 rounded-md text-xs ${
                                  deleting
                                    ? 'bg-slate-800 text-slate-400'
                                    : 'bg-red-600 text-white hover:bg-red-500'
                                }`}
                                disabled={!!deleting}
                                title={
                                  deleting ? `Deleting ${table.name}#${deleting}…` : 'Delete row'
                                }
                                onClick={() => {
                                  if (!idStr) {
                                    alert('No id column found for this row');
                                    return;
                                  }
                                  const ok = confirm(
                                    `Delete ${table.name}#${idStr}? This cannot be undone.`
                                  );
                                  if (!ok) return;
                                  const run = async () => {
                                    setDeleting(idStr);
                                    try {
                                      await deleteDbRow(table.name, idStr);
                                      await reload();
                                    } catch (e: unknown) {
                                      const msg =
                                        e && typeof e === 'object' && 'message' in e
                                          ? String((e as { message?: unknown }).message)
                                          : 'Delete failed';
                                      alert(msg);
                                    } finally {
                                      setDeleting(null);
                                    }
                                  };
                                  void run();
                                }}
                              >
                                {deleting && idStr === deleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-400">No rows</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold mt-0">Database Overview</h2>
          <p className="text-slate-400 mt-0">
            Showing tables, columns, and up to 50 most recent rows per table.
          </p>
        </div>
        <a
          href="/"
          className="px-3 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          Back to App
        </a>
      </div>
      {data.tables.map((t) => (
        <TableCard key={t.name} table={t} />
      ))}
    </div>
  );
};

export default DbView;
