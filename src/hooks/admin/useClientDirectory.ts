"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Flame, UserPlus, Users } from "lucide-react";
import type { DirectoryProfile, DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";
import { adminQueries } from "../../lib/adminQueries";
import { countUniqueClients, countWithin, isClientRole, uniqueClients } from "../../lib/directoryStats";
import { useNavigate, useSearchParams } from "../../lib/router";
import { useAdminSession } from "./useAdminSession";

const NO_PROFILES: Record<string, DirectoryProfile> = {};

// Clients & Bookings: the clients, their Clerk details, the warm leads and the stat cards. The
// directory and its Clerk details are the cached queries the Admin Directory shares.
export function useClientDirectory() {
  const { session, ready } = useAdminSession();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const usersQuery = useQuery({ ...adminQueries.directoryUsers(session), enabled: ready });
  // The clients' photos and dates from Clerk, by Clerk id; without them the rows show initials
  const profilesQuery = useQuery({ ...adminQueries.directoryProfiles(session), enabled: ready });
  const leadsQuery = useQuery({ ...adminQueries.leads(session), enabled: ready });

  const allUsers = usersQuery.data as DirectoryUser[] | undefined;
  const users = allUsers ? allUsers.filter((user) => isClientRole(user.role)) : null;
  // A failed refresh keeps the copy already loaded
  const usersFailed = usersQuery.isError && !allUsers;
  const profiles = profilesQuery.data ?? NO_PROFILES;
  const profilesLoaded = profilesQuery.data !== undefined;
  const leadIds = leadsQuery.data ? new Set(leadsQuery.data) : null;
  const leadsError = leadsQuery.isError && !leadsQuery.data;
  // All three requests answered (or failed): until then the cards and lists show placeholders
  const settled = !usersQuery.isPending && !profilesQuery.isPending && !leadsQuery.isPending;

  const clients = users ?? [];
  // Each warm lead once (a person with two accounts shows as one), as the card counts them
  const leads = leadIds ? uniqueClients(clients.filter((u) => leadIds.has(u.id))) : [];

  // Each client's Clerk details by users.id, for the appointments' rows
  const profilesByUserId: Record<number, DirectoryProfile> = {};
  for (const user of clients) {
    const profile = profiles[user.clerk_id ?? user.id];
    if (user.user_id && profile) profilesByUserId[user.user_id] = profile;
  }

  const leadsFailed = leadsError || usersFailed;
  const leadsLoaded = leadIds !== null && users !== null;
  return {
    usersFailed,
    profiles,
    profilesByUserId,
    /** Opened from the dashboard's warm leads (?view=leads) */
    leadsView: searchParams.get("view") === "leads",
    leads,
    /** Opens a warm lead's client page */
    openLead: (user: DirectoryUser) => user.user_id && navigate(`/clients/${user.user_id}`),
    leadsLoaded,
    leadsFailed,
    /** The warm leads are still on their way: the list shows placeholder rows */
    leadsLoading: !settled,
    /** The line above the warm leads */
    leadsMessage: leadsFailed
      ? "We couldn't load the warm leads."
      : !leadsLoaded
        ? "Loading warm leads…"
        : `${leads.length} warm ${leads.length === 1 ? "lead: made an account or started a booking in the last 60 days, but hasn't" : "leads: made an account or started a booking in the last 60 days, but haven't"} booked a visit yet.`,
    // A card that can't be worked out once everything answered shows a dash
    stats: [
      { label: "Total clients", value: users ? countUniqueClients(clients) : null, hint: "unique, in the directory", icon: Users, loading: !settled },
      { label: "New clients", value: users && profilesLoaded ? countWithin(clients, profiles, "joinedAt", 30) : null, hint: "joined in the last 30 days", icon: UserPlus, loading: !settled },
      { label: "Active clients", value: users && profilesLoaded ? countWithin(clients, profiles, "lastSignInAt", 30) : null, hint: "signed in in the last 30 days", icon: Activity, loading: !settled },
      { label: "Warm leads", value: users && leadIds && !leadsError ? leads.length : null, hint: "active, but haven't booked yet", icon: Flame, loading: !settled },
    ],
  };
}
