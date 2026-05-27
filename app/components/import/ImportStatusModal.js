'use client';

import { JsonPreviewTable } from './JsonPreviewTable';

export function ImportStatusModal({ data, isSubmitting, onCancel, onConfirm }) {
  if (!data) {
    return null;
  }

  const canConfirm = data.kind !== 'error';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.45)] dark:bg-slate-950">
        <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className={getBadgeClassName(data.kind)}>
              {data.kind === 'error' ? 'Erreur' : 'Contrôle prêt'}
            </span>
            <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
              {data.kind === 'xlsx' && 'Importer les données clubs'}
              {data.kind === 'logo' && 'Remplacer le logo du club'}
              {data.kind === 'error' && 'Import impossible'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              {data.fileName} · {data.fileSize}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Fermer
          </button>
        </div>

        {data.kind === 'error' && <ErrorContent errors={data.errors} />}
        {data.kind === 'xlsx' && <XlsxContent data={data} />}
        {data.kind === 'logo' && <LogoContent data={data} />}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Annuler
          </button>
          {canConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:translate-y-[-1px] hover:brightness-110 disabled:translate-y-0 disabled:opacity-60"
            >
              {isSubmitting ? 'Enregistrement...' : 'Confirmer la mise à jour'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function XlsxContent({ data }) {
  const updatedCount = data.changes.filter((change) => change.status === 'updated').length;
  const createdCount = data.changes.filter((change) => change.status === 'created').length;
  const unchangedCount = data.changes.filter((change) => change.status === 'unchanged').length;
  const deletedCount = data.changes.filter((change) => change.status === 'deleted').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Lignes détectées" value={data.rows.length} />
        <Metric label="Modifiés" value={updatedCount} />
        <Metric label="Nouveaux" value={createdCount} />
        <Metric label="Inchangés" value={unchangedCount} />
        <Metric label="Supprimés" value={deletedCount} />
      </div>

      <RulesBlock />
      <JsonPreviewTable rows={data.rows} columns={data.columns} />

      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">Comparaison avant / après</h3>
        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
          {data.changes.slice(0, 12).map((change) => (
            <div key={change.clubName} className="rounded-xl bg-white p-3 text-sm dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-slate-800 dark:text-slate-100">{change.clubName}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800">
                  {change.status}
                </span>
              </div>
              {change.changes.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  {change.changes.length} champ(s) modifié(s) : {change.changes.map((item) => item.field).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogoContent({ data }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        Club détecté : {data.club.nomClub}. Voulez-vous mettre à jour l’icône du club ?
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LogoCard title="Ancien logo" src={data.oldLogoUrl} fallback="Aucun ancien logo" />
        <LogoCard title="Nouveau logo" src={data.previewUrl} fallback="Aperçu indisponible" />
      </div>
    </div>
  );
}

function ErrorContent({ errors }) {
  return (
    <div className="space-y-5">
      <RulesBlock />
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <h3 className="font-black text-red-700 dark:text-red-200">Erreurs détectées</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-700 dark:text-red-200">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RulesBlock() {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
      <p className="font-black">Format XLSX attendu</p>
      <p className="mt-1">Colonne obligatoire : nom_club et type_club (clé composite).</p>
      <p className="mt-1">Au moins une colonne optionnelle requise dans le fichier : numero, region, zone, president, secretaire, vice_president, supprimer.</p>
      <p className="mt-1">Cellule vide : conserve la valeur existante. Saisir "vide" pour effacer réellement un champ.</p>
      <p className="mt-1">Pour supprimer un club, ajoutez la colonne supprimer avec la valeur oui sur la ligne concernée.</p>
      <p className="mt-1">Les logos doivent être nommés au format NOM_CLUB-TYPE_CLUB, par exemple MANAKARA-LION.png ou MANAKARA-LEO.jpg.</p>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function LogoCard({ title, src, fallback }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">{title}</p>
      {src ? (
        <div className="flex h-48 items-center justify-center rounded-xl bg-white p-4 dark:bg-slate-950">
          <img src={src} alt={title} className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-400 dark:border-slate-700">
          {fallback}
        </div>
      )}
    </div>
  );
}

function getBadgeClassName(kind) {
  const baseClassName = 'inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide';

  if (kind === 'error') {
    return `${baseClassName} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200`;
  }

  return `${baseClassName} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200`;
}
