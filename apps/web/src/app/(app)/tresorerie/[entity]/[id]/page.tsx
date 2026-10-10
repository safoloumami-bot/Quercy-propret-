import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("treasury");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
