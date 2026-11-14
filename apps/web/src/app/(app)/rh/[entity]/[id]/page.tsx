import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("hr");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
