import sharp from 'sharp';

/**
 * Le logo est rendu en 155 px de haut dans l'en-tête du compte-rendu
 * (app/components/preview.js) et html2canvas exporte en `scale: 2` :
 * 310 px suffisent. 512 px laisse de la marge pour une évolution de la
 * maquette sans avoir à retoucher les fichiers.
 */
export const LOGO_MAX_EDGE = 512;

/**
 * Garde-fou anti-bombe de décompression. Un PNG de 2 Mo peut déclarer une
 * surface énorme une fois décompressé — cas réel dans ce dépôt :
 * SAINT BENOIT LES EAUX VIVES.png fait 10082x14197, soit 143 Mpx, dont le
 * décodage en RGBA coûte ~570 Mo de RAM. Tant que la route écrivait les
 * octets bruts sans jamais décoder, le risque n'existait pas ; il apparaît
 * dès qu'on redimensionne.
 */
export const UPLOAD_MAX_INPUT_PIXELS = 50 * 1000 * 1000;

/**
 * Seuil du garde-fou anti-réencodage : un fichier déjà aux bonnes dimensions
 * et déjà sous ce poids est laissé strictement intact.
 *
 * Sans lui, réencoder un JPEG déjà compressé regagne encore 5 à 7 % — mais au
 * prix d'une perte générationnelle qui s'accumulerait à chaque passage. C'est
 * aussi ce qui rend l'opération idempotente, condition nécessaire pour la
 * déclencher depuis une requête HTTP.
 */
export const ALREADY_OPTIMIZED_BYTES = 150 * 1024;

const JPEG_EXTENSIONS = ['jpg', 'jpeg'];

export function isOptimizableLogoExtension(extension) {
    return extension === 'png' || JPEG_EXTENSIONS.includes(extension);
}

/**
 * Le fichier est-il déjà à la bonne taille ?
 *
 * L'ordre des tests est important : le poids se lit dans un `stat`, alors que
 * les dimensions imposent de décoder l'en-tête. Un appelant qui connaît déjà
 * la taille (la route HTTP, via stat) écarte donc la majorité des fichiers
 * sans jamais les ouvrir.
 */
export async function isAlreadyOptimized(buffer, options = {}) {
    const maxEdge = options.maxEdge ?? LOGO_MAX_EDGE;
    const limitInputPixels = options.limitInputPixels ?? UPLOAD_MAX_INPUT_PIXELS;

    if (buffer.length > ALREADY_OPTIMIZED_BYTES) {
        return false;
    }

    const metadata = await sharp(buffer, { limitInputPixels })
        .metadata()
        .catch(() => null);

    if (!metadata || !metadata.width || !metadata.height) {
        return false;
    }

    return metadata.width <= maxEdge && metadata.height <= maxEdge;
}

/**
 * Redimensionne et recompresse un logo en conservant son format d'origine.
 *
 * Le format n'est volontairement pas converti : PNG reste PNG pour préserver
 * la transparence (les emblèmes sont posés sur un fond transparent), JPEG
 * reste JPEG. Le gain est de toute façon dimensionnel — passer de 4685x6620
 * à 512 px de côté long élimine plus de 99 % des pixels — et changer
 * l'extension obligerait à renommer les fichiers et à réécrire tous les
 * `clubLogoUrl` de clubs.json.
 */
export async function optimizeLogoBuffer(buffer, extension, options = {}) {
    const maxEdge = options.maxEdge ?? LOGO_MAX_EDGE;
    const limitInputPixels = options.limitInputPixels ?? UPLOAD_MAX_INPUT_PIXELS;

    const source = await sharp(buffer, { limitInputPixels }).metadata();

    const pipeline = sharp(buffer, { limitInputPixels })
        // Applique l'orientation EXIF avant le redimensionnement : sans ça une
        // photo prise au téléphone ressort tournée.
        .rotate()
        .resize({
            width: maxEdge,
            height: maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
        });

    const encoded = extension === 'png'
        ? pipeline.png({ compressionLevel: 9, effort: 10 })
        : pipeline.jpeg({ quality: 82, mozjpeg: true });

    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });

    return {
        buffer: data,
        size: data.length,
        width: info.width,
        height: info.height,
        sourceSize: buffer.length,
        sourceWidth: source.width ?? 0,
        sourceHeight: source.height ?? 0,
    };
}
