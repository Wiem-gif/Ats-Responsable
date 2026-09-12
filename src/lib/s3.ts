import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Permet de pointer vers un service compatible S3 (ex: Supabase Storage)
  // plutôt que vers AWS directement. Laisser AWS_ENDPOINT vide pour utiliser
  // le vrai AWS S3 sans rien changer d'autre.
  ...(process.env.AWS_ENDPOINT && {
    endpoint: process.env.AWS_ENDPOINT,
    forcePathStyle: true, // requis par la plupart des services S3-compatibles
  }),
});

const BUCKET = process.env.AWS_BUCKET_NAME!;

/**
 * Upload un fichier (buffer) vers S3 et renvoie la clé stockée.
 * On stocke la clé en base, pas l'URL brute, pour pouvoir régénérer
 * des URLs signées temporaires à la lecture (le bucket doit rester privé).
 */
export async function uploadCvToS3(params: {
  buffer: Buffer;
  key: string;
  contentType: string;
}): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );
  return params.key;
}

/**
 * Génère une URL signée temporaire pour lire un CV (bucket privé par défaut,
 * cohérent avec l'exigence de confidentialité des données candidat).
 */
export async function getSignedCvUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Supprime définitivement un fichier CV du bucket — utilisé lors d'une
 * demande de suppression RGPD, pour ne pas se contenter de retirer la
 * référence en base tout en laissant le fichier accessible côté stockage.
 */
export async function deleteCvFromS3(key: string): Promise<void> {
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}