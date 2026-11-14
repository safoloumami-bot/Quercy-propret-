import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("documents");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
