import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("projects");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
