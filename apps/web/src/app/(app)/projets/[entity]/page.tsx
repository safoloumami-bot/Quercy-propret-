import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("projects");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
