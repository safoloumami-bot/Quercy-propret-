import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("cleaning");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
