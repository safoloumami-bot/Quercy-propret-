import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("sales");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
