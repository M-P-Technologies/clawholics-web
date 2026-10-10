// The frontend calls the gallery as /api/api/services/:id/gallery; the Worker accepted the extra /api.

export const dynamic = "force-dynamic";

export { GET, POST } from "../../../../services/[id]/gallery/route";
