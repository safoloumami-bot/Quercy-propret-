import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("purchases");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
