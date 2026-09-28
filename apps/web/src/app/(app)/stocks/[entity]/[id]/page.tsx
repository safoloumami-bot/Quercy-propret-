import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("inventory");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
