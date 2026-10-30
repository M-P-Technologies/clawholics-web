// An artist's role (nailist_categories) decides which price they charge and may be hidden on the site

type RoleFields = { is_master?: number | boolean | null; category_id?: number | null };

/** Whether the artist charges the master price: their role's flag, or the original Master Technician (1) for older data */
export const isMasterArtist = (artist: RoleFields | null | undefined) =>
  !!artist && (artist.is_master === undefined || artist.is_master === null ? artist.category_id === 1 : Number(artist.is_master) === 1);

/** The role to show on the site: nothing when the artist hides it */
export const publicPosition = (artist: { position?: string | null; hide_position?: number | boolean | null }) =>
  Number(artist.hide_position) === 1 ? "" : artist.position ?? "";
