import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("inventory");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
