'use client';

import { getColumnLabel } from '../../../lib/validateClubData';

export function JsonPreviewTable({ rows, columns = [] }) {
  const previewRows = rows.slice(0, 8);
  const displayColumns = columns.length > 0
    ? columns
    : Object.keys(previewRows[0] ?? {});

  if (displayColumns.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {displayColumns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {getColumnLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {previewRows.map((row, index) => (
              <tr key={`${row.nom_club}-${index}`} className="text-slate-700 dark:text-slate-200">
                {displayColumns.map((column) => (
                  <td
                    key={`${column}-${index}`}
                    className={column === 'nom_club' ? 'max-w-[220px] truncate px-4 py-3 font-semibold' : 'px-4 py-3'}
                  >
                    {row[column] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > previewRows.length && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
          Aperçu limité à {previewRows.length} lignes sur {rows.length}.
        </div>
      )}
    </div>
  );
}
