import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("treasury");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
