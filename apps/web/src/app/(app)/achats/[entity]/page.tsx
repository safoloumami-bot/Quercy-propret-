import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("purchases");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
