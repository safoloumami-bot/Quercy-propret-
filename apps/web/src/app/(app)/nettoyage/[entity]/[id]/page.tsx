import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("cleaning");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
