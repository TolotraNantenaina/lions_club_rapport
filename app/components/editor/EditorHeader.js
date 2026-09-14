'use client';

import { CLUB_TYPE } from '../../../lib/clubSearchFilter';

export function EditorHeader({ clubType, selectedClub }) {
  const club = selectedClub || {};
  const logoSrc = club.clubLogoUrl || '';

  return (
    <div className="pointer-events-auto px-[70px] pt-[70px] pb-[10px]">
      <header className="mb-8 flex items-start justify-between text-center">
        {/* Left logo */}
        <div className="flex h-[155px] w-[155px] shrink-0 items-center justify-center">
          <img
            src={'/ico_lions_club.png'}
            alt={clubType === CLUB_TYPE.LEO ? 'Logo Leo Club' : 'Logo Lions Club'}
            className="h-[155px] w-[155px]"
          />
        </div>

        {/* Centre: club info */}
        <div className="flex-1 text-center">
          <h1 className="text-[42px] font-black leading-tight tracking-wide text-[#173d68]">
            {clubType === CLUB_TYPE.LEO ? 'LEO' : 'LIONS'} CLUB
          </h1>
          <h2 className="text-[38px] font-black leading-tight tracking-wide text-[#173d68]">
            {club.nomClub || 'Nom du club'}
          </h2>
          <p className="mt-2 text-[22px] font-semibold text-[#173d68]">
            DISTRICT 417 – {club.Region || 'Région'} – {club.Zone || 'Zone'}
          </p>
          <p className="mt-3 text-[18px] text-slate-700">
            N° Club : {club.numeroAffiliation || '–'}
          </p>
        </div>

        {/* Right: club logo */}
        <div className={`flex h-[155px] w-[155px] shrink-0 items-center justify-center
          ${logoSrc ? 'bg-transparent' : 'bg-gradient-to-b from-slate-100 to-sky-200 px-3 py-4 text-[18px] font-bold leading-tight text-[#173d68]'}`}>
          {logoSrc ? (
            <img src={logoSrc} alt="Logo du club" className="h-[155px] w-auto" />
          ) : (
            <div className="flex h-[105px] w-[105px] items-center justify-center border-2 border-dashed border-primary text-xs">
              logo
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
