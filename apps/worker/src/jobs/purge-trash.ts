import { prisma } from "@quercy/db";
import { deleteObject } from "@quercy/storage";

/** Durée de conservation en corbeille. */
export const TRASH_RETENTION_DAYS = 30;

export interface PurgeResult {
  companies: number;
  contacts: number;
  comments: number;
  files: number;
  views: number;
}

/**
 * Suppression définitive des éléments en corbeille depuis plus de 30 jours (toutes les
 * entreprises clientes). Les fichiers sont aussi effacés du stockage.
 */
export async function purgeTrash(now: Date = new Date()): Promise<PurgeResult> {
  const before = new Date(now.getTime() - TRASH_RETENTION_DAYS * 86_400_000);
  const expired = { deletedAt: { lt: before } };

  const files = await prisma.storedFile.findMany({
    where: expired,
    select: { id: true, storageKey: true },
  });
  for (const file of files) {
    try {
      await deleteObject(file.storageKey);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "warn",
          msg: "purge.file_delete_failed",
          id: file.id,
          error: String(error),
        }),
      );
    }
  }
  const [contacts, companies, comments, removedFiles, views] = await prisma.$transaction([
    prisma.contact.deleteMany({ where: expired }),
    prisma.company.deleteMany({ where: expired }),
    prisma.comment.deleteMany({ where: expired }),
    prisma.storedFile.deleteMany({ where: { id: { in: files.map((f) => f.id) } } }),
    prisma.savedView.deleteMany({ where: expired }),
  ]);
  return {
    companies: companies.count,
    contacts: contacts.count,
    comments: comments.count,
    files: removedFiles.count,
    views: views.count,
  };
}
