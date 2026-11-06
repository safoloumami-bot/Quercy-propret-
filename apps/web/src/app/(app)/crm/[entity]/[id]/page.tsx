import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("crm");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
