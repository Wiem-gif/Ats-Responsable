import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
   ...(process.env.AWS_ENDPOINT && {
    endpoint: process.env.AWS_ENDPOINT,
    forcePathStyle: true, 
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
