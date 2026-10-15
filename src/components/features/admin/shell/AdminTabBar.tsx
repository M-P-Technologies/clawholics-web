import { useClerk } from "@clerk/nextjs";
import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";
import { Button } from "@/components/atoms";
import { TabBar } from "@/components/organisms";
import { MORE_GROUPS, MORE_ITEMS, TAB_ITEMS } from "@/components/features/admin/shell/adminNav";

// The phone's admin navigation: four tabs go straight to the screens used every day; "More" opens a
// sheet with the content screens, the admin directory and the account actions.
const sheetLink = (active: boolean) =>
  clsx("block py-3 text-sm font-medium tracking-wide", active ? "text-crimson" : "text-gray-red");

export default function AdminTabBar() {
  const { pathname } = useLocation();
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
    <TabBar
      label="Admin tabs"
      items={TAB_ITEMS}
      more={{
        id: "admin-more-menu",
        isActive: MORE_ITEMS.some((item) => item.path === pathname),
        content: (close) => (
          <>
            {MORE_GROUPS.map((group) => (
              <section key={group.title} aria-label={group.title} className="pb-1">
                <h2 className="pb-1 pt-3 font-display text-lg font-normal text-gray-red/70">{group.title}</h2>
                {group.items.map((item) => (
                  <Link key={item.path} to={item.path} className={sheetLink(pathname === item.path)}>
                    {item.label}
                  </Link>
                ))}
              </section>
            ))}

            <div className="my-2 border-t border-crimson-light/70" />

            <Button
              variant="bare"
              type="button"
              className="block w-full py-3 text-left text-sm text-gray-red/80 transition-colors hover:text-crimson"
              onClick={() => {
                clerk.openUserProfile();
                close();
              }}
            >
              Manage account
            </Button>
            <Button
              variant="bare"
              type="button"
              className="block w-full py-3 text-left text-sm text-gray-red/80 transition-colors hover:text-crimson"
              onClick={() => {
                close();
                void logout();
              }}
            >
              Log out
            </Button>
          </>
        ),
      }}
    />
  );
}
