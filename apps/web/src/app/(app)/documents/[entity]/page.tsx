import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("documents");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
