'use client';

export function JsonPreviewTable({ rows }) {
  const previewRows = rows.slice(0, 8);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">Région</th>
              <th className="px-4 py-3">Président</th>
              <th className="px-4 py-3">Secrétaire</th>
              <th className="px-4 py-3">Vice-Président</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {previewRows.map((row, index) => (
              <tr key={`${row.nom_club}-${index}`} className="text-slate-700 dark:text-slate-200">
                <td className="max-w-[220px] truncate px-4 py-3 font-semibold">{row.nom_club}</td>
                <td className="px-4 py-3">{row.region}</td>
                <td className="px-4 py-3">{row.president}</td>
                <td className="px-4 py-3">{row.secretaire}</td>
                <td className="px-4 py-3">{row.vice_president}</td>
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
