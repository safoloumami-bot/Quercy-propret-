import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("crm");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
