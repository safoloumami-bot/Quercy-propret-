import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("support");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
