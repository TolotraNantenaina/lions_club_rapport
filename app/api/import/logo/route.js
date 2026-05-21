import { NextResponse } from 'next/server';
import { findClubByLogoFileName } from '../../../../lib/validateLogo';
import { saveClubLogo, readClubsJson, writeClubsJson } from '../../../../lib/serverClubStorage';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, errors: ['Aucune image valide reçue.'] },
        { status: 400 },
      );
    }

    const clubs = await readClubsJson();
    const logoValidation = findClubByLogoFileName(file.name, clubs);

    if (!logoValidation.ok || !logoValidation.club) {
      return NextResponse.json(
        { ok: false, errors: logoValidation.errors },
        { status: 422 },
      );
    }

    const nextLogoUrl = await saveClubLogo(file, logoValidation.club);
    const updatedClubs = clubs.map((club) => {
      if (club.nomClub === logoValidation.club?.nomClub) {
        return {
          ...club,
          clubLogoUrl: nextLogoUrl,
        };
      }

      return club;
    });

    await writeClubsJson(updatedClubs);

    return NextResponse.json({
      ok: true,
      clubName: logoValidation.club.nomClub,
      clubLogoUrl: nextLogoUrl,
    });
  } catch (error) {
    console.error('Erreur import logo', error);

    return NextResponse.json(
      { ok: false, errors: ['Une erreur serveur est survenue pendant l’import du logo.'] },
      { status: 500 },
    );
  }
}
