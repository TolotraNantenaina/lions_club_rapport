# Import des clubs

## Fichier XLSX attendu

### Colonnes

| Type | Colonnes |
|------|----------|
| Obligatoire | `nom_club` (clé primaire) |
| Optionnelles | `numero`, `region`, `zone`, `president`, `secretaire`, `vice_president`, `supprimer` |

Au moins **une** colonne optionnelle doit être présente dans le fichier.

### Règles de valeur

| Contenu de la cellule | Effet |
|----------------------|-------|
| Vide | Conserve la valeur existante dans `clubs.json` |
| `vide` | Efface réellement le champ (enregistre une chaîne vide) |
| Autre texte | Met à jour avec la nouvelle valeur |

### Suppression

Ajoutez la colonne `supprimer` avec la valeur `oui` sur la ligne du club à retirer.

### Exemple

```text
nom_club;president;secretaire
MANAKARA;Nouveau Président;
GRAND BAIE;;vide
```

- Ligne 1 : met à jour le président, conserve le secrétaire existant
- Ligne 2 : conserve le président existant, efface le secrétaire

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
  "clubLogoUrl": "/clubsIcons/GRAND-BAIE.png"
}
```

## Logos

Les logos doivent être au format `.png`, `.jpg` ou `.jpeg`.

Le nom du fichier doit correspondre au slug du club en majuscules :

```text
GRAND BAIE -> GRAND-BAIE.png
MANAKARA -> MANAKARA.png
```

Les images sont enregistrées dans `public/clubsIcons`, puis `public/data/clubs.json` est mis à jour avec le nouveau `clubLogoUrl`.
