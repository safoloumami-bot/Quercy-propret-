import { prisma } from "@quercy/db";
import { deleteObject } from "@quercy/storage";

/** Durée de conservation en corbeille. */
export const TRASH_RETENTION_DAYS = 30;

export interface PurgeResult {
  /** Fiches des modules complémentaires (achats, stocks, agenda, support, RH, trésorerie, documents). */
  others: number;
  companies: number;
  contacts: number;
  deals: number;
  activities: number;
  products: number;
  documents: number;
  projects: number;
  tasks: number;
  timeEntries: number;
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
  // Ordre : des fiches dépendantes vers les fiches parentes.
  const [
    timeEntries,
    tasks,
    activities,
    documents,
    deals,
    projects,
    contacts,
    products,
    companies,
    comments,
    removedFiles,
    views,
  ] = await prisma.$transaction([
    prisma.timeEntry.deleteMany({ where: expired }),
    prisma.task.deleteMany({ where: expired }),
    prisma.activity.deleteMany({ where: expired }),
    // Seuls des brouillons peuvent être en corbeille : les documents émis ne se suppriment pas.
    prisma.salesDocument.deleteMany({ where: expired }),
    prisma.deal.deleteMany({ where: expired }),
    prisma.project.deleteMany({ where: expired }),
    prisma.contact.deleteMany({ where: expired }),
    prisma.product.deleteMany({ where: expired }),
    prisma.company.deleteMany({ where: expired }),
    prisma.comment.deleteMany({ where: expired }),
    prisma.storedFile.deleteMany({ where: { id: { in: files.map((f) => f.id) } } }),
    prisma.savedView.deleteMany({ where: expired }),
  ]);
  // Modules complémentaires, des fiches dépendantes vers les fiches parentes.
  const others = await prisma.$transaction([
    prisma.stockMovement.deleteMany({ where: expired }),
    prisma.bankTransaction.deleteMany({ where: expired }),
    prisma.leave.deleteMany({ where: expired }),
    prisma.document.deleteMany({ where: expired }),
    prisma.bill.deleteMany({ where: expired }),
    prisma.purchaseOrder.deleteMany({ where: expired }),
    prisma.expense.deleteMany({ where: expired }),
    prisma.event.deleteMany({ where: expired }),
    prisma.ticket.deleteMany({ where: expired }),
    prisma.warehouse.deleteMany({ where: expired }),
    prisma.bankAccount.deleteMany({ where: expired }),
    prisma.employee.deleteMany({ where: expired }),
    prisma.supplier.deleteMany({ where: expired }),
  ]);
  return {
    others: others.reduce((sum, r) => sum + r.count, 0),
    companies: companies.count,
    contacts: contacts.count,
    deals: deals.count,
    activities: activities.count,
    products: products.count,
    documents: documents.count,
    projects: projects.count,
    tasks: tasks.count,
    timeEntries: timeEntries.count,
    comments: comments.count,
    files: removedFiles.count,
    views: views.count,
  };
}
