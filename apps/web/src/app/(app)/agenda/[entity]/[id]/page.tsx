import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("calendar");

export const generateMetadata = routes.recordMetadata;
export default routes.RecordPage;
