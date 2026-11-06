import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("hr");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
