// The frontend calls the gallery as /api/api/gallery/:id; the Worker accepted the extra /api.

export const dynamic = "force-dynamic";

export { DELETE, PUT } from "../../../gallery/[id]/route";
