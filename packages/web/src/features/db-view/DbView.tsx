import React, { useEffect, useRef, useState } from 'react';
import {
  getDbOverview,
  deleteDbRow,
  type DbOverview,
  type DbTableOverview,
} from '../../shared/api/client.js';
import { RequireAdmin } from '../../shared/auth/RequireAdmin.js';

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

/** Header bar with title and back button */
const Header: React.FC = () => (
  <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
    <h1 className="text-lg font-semibold text-slate-100 m-0">Database Explorer</h1>
    <a
      href="#/"
      className="px-3 py-1.5 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-medium"
    >
      ← Back to App
    </a>
  </header>
);

/** Tab bar for switching between tables - cascading overlapping tabs */
const TabBar: React.FC<{
  tables: DbTableOverview[];
  activeTable: string;
  onSelect: (name: string) => void;
}> = ({ tables, activeTable, onSelect }) => {
  const activeIndex = tables.findIndex((t) => t.name === activeTable);

  return (
    <div className="relative flex items-end bg-slate-800 pl-2 pt-2 overflow-x-auto overflow-y-hidden">
      {tables.map((t, i) => {
        const isActive = t.name === activeTable;
        // Calculate z-index: active tab is always on top, others cascade from left
        // Inactive tabs: lower index = lower z-index (appears behind)
        // Active tab gets highest z-index
        const zIndex = isActive ? 50 : i < activeIndex ? i : tables.length - i;

        return (
          <button
            key={t.name}
            onClick={() => onSelect(t.name)}
            style={{
              zIndex,
              marginLeft: i === 0 ? 0 : '-24px', // overlap amount
            }}
            className={`
              relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-all
              rounded-t-lg border border-b-0
              ${
                isActive
                  ? 'bg-slate-950 text-slate-100 border-slate-600 shadow-lg'
                  : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-slate-200'
              }
            `}
          >
            {t.name}
            {typeof t.rowCount === 'number' && (
              <span className={`ml-1.5 text-xs ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                ({t.rowCount})
              </span>
            )}
            {/* Bottom edge connector for active tab */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-slate-950 -mb-px" />
            )}
          </button>
        );
      })}
      {/* Bottom border line that goes behind tabs */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-600" />
    </div>
  );
};

/** Table content panel (Excel-like grid) */
const TablePanel: React.FC<{
  table: DbTableOverview;
  deleting: string | null;
  onDelete: (tableName: string, id: string) => void;
}> = ({ table, deleting, onDelete }) => {
  const sampleRows = table.sample ?? [];
  const columns: string[] = sampleRows.length
    ? Object.keys(sampleRows[0]!)
    : table.columns.map((c) => c.name);

  return (
    <div className="flex-1 overflow-auto bg-slate-950">
      {/* Column schema info */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{table.name}</span>
          <span>•</span>
          <span>{table.columns.length} columns</span>
          <span>•</span>
          <span>{typeof table.rowCount === 'number' ? `${table.rowCount} rows` : 'N/A'}</span>
          <span>•</span>
          <span className="text-slate-500">
            Columns: {table.columns.map((c) => `${c.name} (${c.type})`).join(', ')}
          </span>
        </div>
      </div>

      {/* Data grid */}
      <div className="overflow-x-auto">
        {sampleRows.length ? (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-800">
                {/* Row number column */}
                <th className="text-left px-3 py-2 text-slate-500 font-medium border-r border-b border-slate-700 bg-slate-800 w-12">
                  #
                </th>
                {columns.map((k) => (
                  <th
                    key={k}
                    className="text-left px-3 py-2 text-slate-300 font-medium border-r border-b border-slate-700 bg-slate-800 whitespace-nowrap"
                  >
                    {k}
                  </th>
                ))}
                <th className="text-left px-3 py-2 text-slate-300 font-medium border-b border-slate-700 bg-slate-800 w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row: unknown, i: number) => {
                const rec = row as DbRow;
                const idVal = rec.id ?? rec.ID ?? rec.Id ?? rec[columns[0]!];
                const idStr =
                  typeof idVal === 'string' || typeof idVal === 'number'
                    ? String(idVal)
                    : undefined;

                return (
                  <tr
                    key={i}
                    className="border-b border-slate-800 hover:bg-slate-900/70 transition-colors"
                  >
                    {/* Row number */}
                    <td className="px-3 py-2 text-slate-500 border-r border-slate-800 bg-slate-900/30 text-xs">
                      {i + 1}
                    </td>
                    {columns.map((k) => {
                      const val = rec[k];
                      const display = toDisplay(val);
                      const isLong = display.length > 100;
                      return (
                        <td
                          key={k}
                          className="px-3 py-2 border-r border-slate-800 align-top max-w-xs truncate"
                          title={isLong ? display : undefined}
                        >
                          {display}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <button
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          deleting
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-red-600/80 text-white hover:bg-red-500'
                        }`}
                        disabled={!!deleting}
                        title={deleting ? `Deleting…` : 'Delete row'}
                        onClick={() => {
                          if (!idStr) {
                            alert('No id column found for this row');
                            return;
                          }
                          onDelete(table.name, idStr);
                        }}
                      >
                        {deleting && idStr === deleting ? '…' : '✕'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-500">
            No rows in this table
          </div>
        )}
      </div>
    </div>
  );
};

export const DbView: React.FC = () => {
  const [data, setData] = useState<DbOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const reload = React.useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    return getDbOverview(signal)
      .then((d) => {
        setData(d);
        // Set first table as active if not already set
        setActiveTable((prev) => (prev ? prev : (d.tables[0]?.name ?? '')));
      })
      .catch((e) => {
        // Ignore abort errors
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load DB overview');
      })
      .finally(() => { setLoading(false); });
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void reload(ctrl.signal);
    return () => abortRef.current?.abort();
  }, [reload]);

  const handleDelete = (tableName: string, id: string) => {
    const ok = confirm(`Delete ${tableName}#${id}? This cannot be undone.`);
    if (!ok) return;

    const run = async () => {
      setDeleting(id);
      try {
        await deleteDbRow(tableName, id);
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
  };

  const content = (() => {
    // Loading state
    if (loading) {
      return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-400">Loading database…</div>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="h-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-red-400">{error}</div>
          </div>
        </div>
      );
    }

    if (!data) return null;

    const currentTable = data.tables.find((t) => t.name === activeTable);

    return (
      <div className="h-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
        {/* Fixed header */}
        <Header />

        {/* Tab bar below header */}
        <TabBar tables={data.tables} activeTable={activeTable} onSelect={setActiveTable} />

        {/* Table content area */}
        {currentTable ? (
          <TablePanel table={currentTable} deleting={deleting} onDelete={handleDelete} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a table to view its data
          </div>
        )}
      </div>
    );
  })();

  return <RequireAdmin title="DB View">{content}</RequireAdmin>;
};

export default DbView;
