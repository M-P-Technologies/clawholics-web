import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { SideBar as SideBarOrganism } from "@/components/organisms";
import { Button } from "@/components/atoms";
import AdminTabBar from "@/components/features/admin/shell/AdminTabBar";
import { NAV_GROUPS } from "@/components/features/admin/shell/adminNav";

// The admin's navigation: the bottom tab bar on phones, the sidebar from `lg` up
export default function SideBar() {
  const clerk = useClerk();
  const logout = async () => {
    try {
      await clerk.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <>
      <AdminTabBar />
      <div className="mr-6 hidden h-full shrink-0 lg:block">
        <SideBarOrganism
          label="Admin navigation"
          groups={NAV_GROUPS}
          storageKey="clawholics-admin-sidebar-collapsed"
          footer={(collapsed) =>
            collapsed ? (
              <Button type="button" onClick={logout} aria-label="Log out" title="Log out" className="h-10 w-full rounded-full !px-0">
                <LogOut size={18} aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" className="w-full rounded-full" onClick={logout}>Log out</Button>
            )
          }
        />
      </div>
    </>
  );
}
