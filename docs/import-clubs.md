# Import des clubs

## Fichier XLSX attendu

La première feuille du fichier `.xlsx` doit contenir ces colonnes exactes :

```text
nom_club | numero | region | zone | president | secretaire | vice_president
```

Exemple :

```text
nom_club;numero;region;zone;president;secretaire;vice_president
GRAND BAIE;192302;Région 5;Zone 51;Poly Leung;Shirley Dawoo;Nom Vice-President
POINTE AUX CANONNIERS;192290;Région 5;Zone 51;Marie-Catherine Tonta;Floryse Wang Fong;Nom Vice-President
```

L'application conserve la structure actuelle de `public/data/clubs.json`. Les champs utilisés par le PV sont mis à jour sans modifier le schéma existant.

## Exemple JSON actuel

```json
{
  "nomClub": "GRAND BAIE",
  "numeroAffiliation": "192302",
  "President": "Poly Leung",
  "vicePresident": "",
  "Secretaire": "Shirley Dawoo",
  "Region": "Région 5",
  "Zone": "Zone 51",
  "clubLogoUrl": "/clubsIcons/grand-baie.png"
}
```

## Logos

Les logos doivent être au format `.png`, `.jpg` ou `.jpeg`.

Le nom du fichier doit correspondre au slug du club :

```text
GRAND BAIE -> grand-baie.png
SAINT-DENIS CŒUR MÉTISSE -> saint-denis-coeur-metisse.png
```

Les images sont enregistrées dans `public/clubsIcons`, puis `public/data/clubs.json` est mis à jour avec le nouveau `clubLogoUrl`.
