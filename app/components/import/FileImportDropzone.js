'use client';

import { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { buildClubChanges, validateImportedClubRows } from '../../../lib/validateClubData';
import { parseExcelFile } from '../../../lib/parseExcel';
import { validateLogoFile } from '../../../lib/validateLogo';
import { ImportStatusModal } from './ImportStatusModal';

const ACCEPTED_FILES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
};

export function FileImportDropzone({ clubsData, clubsLoading = false, onImportComplete }) {
  const [modalData, setModalData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const onDrop = async (acceptedFiles, rejectedFiles) => {
    setStatusMessage('');

    if (rejectedFiles.length > 0) {
      const rejectedFile = rejectedFiles[0].file;
      setSelectedFile(rejectedFile);
      setModalData({
        kind: 'error',
        fileName: rejectedFile.name,
        fileSize: formatBytes(rejectedFile.size),
        errors: rejectedFiles[0].errors.map((error) => error.message),
      });
      return;
    }

    const file = acceptedFiles[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setIsAnalyzing(true);

    try {
      if (isXlsxFile(file)) {
        await analyzeXlsx(file);
        return;
      }

      if (isLogoFile(file)) {
        await analyzeLogo(file);
        return;
      }

      setModalData({
        kind: 'error',
        fileName: file.name,
        fileSize: formatBytes(file.size),
        errors: ['Format non supporté. Formats acceptés : .xlsx, .png, .jpg, .jpeg.'],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeXlsx = async (file) => {
    const parsed = await parseExcelFile(file);
    const validationIssues = validateImportedClubRows(parsed.rows);
    const allIssues = [...parsed.issues, ...validationIssues];
    const errors = allIssues.filter((issue) => issue.type === 'error');

    if (errors.length > 0) {
      setModalData({
        kind: 'error',
        fileName: file.name,
        fileSize: formatBytes(file.size),
        errors: errors.map((issue) => issue.message),
      });
      return;
    }

    setModalData({
      kind: 'xlsx',
      fileName: file.name,
      fileSize: formatBytes(file.size),
      rows: parsed.rows,
      issues: allIssues,
      changes: buildClubChanges(clubsData, parsed.rows),
    });
  };

  const analyzeLogo = async (file) => {
    const validation = await validateLogoFile(file, clubsData);

    if (!validation.ok || !validation.club) {
      setModalData({
        kind: 'error',
        fileName: file.name,
        fileSize: formatBytes(file.size),
        errors: validation.errors,
      });
      return;
    }

    setModalData({
      kind: 'logo',
      fileName: file.name,
      fileSize: formatBytes(file.size),
      club: validation.club,
      oldLogoUrl: validation.club.clubLogoUrl,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const confirmImport = async () => {
    if (!selectedFile || !modalData || modalData.kind === 'error') {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');

    try {
      const endpoint = modalData.kind === 'xlsx' ? '/api/import/xlsx' : '/api/import/logo';
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setModalData({
          kind: 'error',
          fileName: selectedFile.name,
          fileSize: formatBytes(selectedFile.size),
          errors: Array.isArray(result.errors) ? result.errors : ['L’import a échoué.'],
        });
        return;
      }

      setStatusMessage(modalData.kind === 'xlsx'
        ? `Import XLSX terminé : ${result.updatedCount} modifié(s), ${result.createdCount} nouveau(x).`
        : `Logo mis à jour pour ${result.clubName}.`);
      closeModal();
      await onImportComplete();
    } catch (error) {
      console.error('Erreur pendant la confirmation d’import', error);
      setModalData({
        kind: 'error',
        fileName: selectedFile.name,
        fileSize: formatBytes(selectedFile.size),
        errors: ['Une erreur réseau ou serveur est survenue pendant l’import.'],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    if (modalData?.kind === 'logo') {
      URL.revokeObjectURL(modalData.previewUrl);
    }

    setModalData(null);
    setSelectedFile(null);
  };

  const { getRootProps, getInputProps, isDragActive, isFocused } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    multiple: false,
    disabled: isAnalyzing || isSubmitting || clubsLoading,
    maxSize: 8 * 1024 * 1024,
  });

  const selectedFileMeta = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return {
      name: selectedFile.name,
      size: formatBytes(selectedFile.size),
      type: detectFileType(selectedFile),
    };
  }, [selectedFile]);

  return (
    <section className="w-full rounded-[24px] bg-white/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:bg-slate-950">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Import professionnel</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Mettre à jour clubs et logos</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Importez un fichier XLSX ou un logo PNG/JPG. Les données sont validées avant enregistrement.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {clubsData.length} club(s) chargés
        </span>
      </div>

      <div
        {...getRootProps()}
        className={[
          'group cursor-pointer rounded-[22px] border-2 border-dashed p-8 text-center transition duration-300',
          'bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950',
          isDragActive || isFocused
            ? 'scale-[1.01] border-primary shadow-[0_20px_50px_rgba(44,90,160,0.18)]'
            : 'border-slate-200 hover:border-primary/70 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-slate-700',
          clubsLoading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl transition group-hover:scale-105">
          {isAnalyzing ? '⏳' : '⬆️'}
        </div>
        <p className="mt-4 text-lg font-black text-slate-900 dark:text-white">
          {isDragActive ? 'Déposez le fichier ici' : 'Glissez-déposez un fichier ici'}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          ou cliquez pour sélectionner un fichier .xlsx, .png, .jpg ou .jpeg
        </p>

        {selectedFileMeta && (
          <div className="mx-auto mt-5 grid max-w-xl gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-3">
            <Meta label="Fichier" value={selectedFileMeta.name} />
            <Meta label="Taille" value={selectedFileMeta.size} />
            <Meta label="Type" value={selectedFileMeta.type} />
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      <ImportStatusModal
        data={modalData}
        isSubmitting={isSubmitting}
        onCancel={closeModal}
        onConfirm={confirmImport}
      />
    </section>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate font-bold text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function isXlsxFile(file) {
  return file.name.toLowerCase().endsWith('.xlsx');
}

function isLogoFile(file) {
  return /\.(png|jpg|jpeg)$/i.test(file.name);
}

function detectFileType(file) {
  if (isXlsxFile(file)) {
    return 'Données XLSX';
  }

  if (isLogoFile(file)) {
    return 'Logo club';
  }

  return file.type || 'Inconnu';
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 o';
  }

  const units = ['o', 'Ko', 'Mo', 'Go'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
