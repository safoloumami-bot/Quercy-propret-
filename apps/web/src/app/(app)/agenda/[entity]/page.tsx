import { entityRoutes } from "@/lib/entity-routes";

const routes = entityRoutes("calendar");

export const generateMetadata = routes.listMetadata;
export default routes.ListPage;
