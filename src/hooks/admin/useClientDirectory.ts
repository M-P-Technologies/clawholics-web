"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Activity, Flame, UserPlus, Users } from "lucide-react";
import type { DirectoryProfile, DirectoryUser } from "../../components/admin/DirectoryProfileCard";
import { countWithin, isClientRole } from "../../lib/directoryStats";
import { useSearchParams } from "../../lib/router";
import { fetchWarmLeads } from "../../services/dashboardService";
import { fetchDirectoryProfiles, fetchDirectoryUsers } from "../../services/directoryService";

// Clients & Bookings: the clients, their Clerk details, the warm leads and the stat cards
export function useClientDirectory() {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user: currentUser } = useUser();
  const [searchParams] = useSearchParams();

  const [users, setUsers] = useState<DirectoryUser[] | null>(null);
  const [usersFailed, setUsersFailed] = useState(false);
  // The clients' photos and dates from Clerk, by Clerk id; without them the rows show initials
  const [profiles, setProfiles] = useState<Record<string, DirectoryProfile>>({});
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [leadIds, setLeadIds] = useState<Set<string> | null>(null);
  const [leadsError, setLeadsError] = useState(false);
  // All three requests answered (or failed): until then the cards and lists show placeholders
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!isAuthLoaded) return;
    let live = true;
    (async () => {
      // Without a session token nothing can load: show the failure rather than placeholders forever
      const token = await getToken().catch(() => undefined);
      if (token === undefined) {
        if (!live) return;
        setUsersFailed(true);
        setLeadsError(true);
        setSettled(true);
        return;
      }
      const [usersResult, profilesResult, leadsResult] = await Promise.allSettled([
        fetchDirectoryUsers(token, currentUser?.id),
        fetchDirectoryProfiles(token, currentUser?.id),
        fetchWarmLeads(token, currentUser?.id),
      ]);
      if (!live) return;
      if (usersResult.status === "fulfilled") setUsers(usersResult.value.filter((user) => isClientRole(user.role)));
      else setUsersFailed(true);
      if (profilesResult.status === "fulfilled") {
        setProfiles(profilesResult.value.profiles);
        setProfilesLoaded(true);
      }
      if (leadsResult.status === "fulfilled") setLeadIds(new Set(leadsResult.value.clerkIds));
      else setLeadsError(true);
      setSettled(true);
    })();
    return () => {
      live = false;
    };
  }, [isAuthLoaded, getToken, currentUser?.id]);

  const clients = users ?? [];
  const leads = leadIds ? clients.filter((u) => leadIds.has(u.id)) : [];

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
      { label: "Total clients", value: users ? clients.length : null, hint: "in the directory", icon: Users, loading: !settled },
      { label: "New clients", value: users && profilesLoaded ? countWithin(clients, profiles, "joinedAt", 30) : null, hint: "joined in the last 30 days", icon: UserPlus, loading: !settled },
      { label: "Active clients", value: users && profilesLoaded ? countWithin(clients, profiles, "lastSignInAt", 30) : null, hint: "signed in in the last 30 days", icon: Activity, loading: !settled },
      { label: "Warm leads", value: users && leadIds && !leadsError ? leads.length : null, hint: "active, but haven't booked yet", icon: Flame, loading: !settled },
    ],
  };
}
