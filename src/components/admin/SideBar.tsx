import { useClerk } from "@clerk/nextjs";
import Bow from "@/assets/bow.svg";
import { useLocation, useNavigate } from "@/lib/router";
import logo from "../../assets/logo/logo-pink-transparent.png";
import Button from "../ui/Button";
import Pearls from "../ui/Pearls";
import AdminTabBar from "./AdminTabBar";
import { NAV_GROUPS } from "./adminNav";

export const SideBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
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
      {/* PHONE: bottom tab bar */}
      <AdminTabBar />

      {/* LG+ SIDEBAR ONLY */}
      <div className="mr-5 hidden h-full shrink-0 lg:block">
        <aside className="flex h-full w-64 flex-col overflow-y-auto rounded-2xl bg-milk px-6 py-8 shadow-petal">
          {/* The logo file has a lot of empty space around it (the artwork is 3218 x 860 of a
              3840 x 2160 image), so it is sized and offset to show just the artwork. */}
          <div className="relative aspect-[3218/860] w-full shrink-0 overflow-hidden">
            <img
              src={logo.src}
              alt="Clawholics by Max"
              className="absolute max-w-none select-none"
              style={{ width: "119.33%", left: "-8.48%", top: "-70.12%" }}
            />
          </div>

          <Pearls className="my-6" />

          <div className="flex-1">
            <nav aria-label="Admin navigation" className="flex flex-col gap-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col gap-1">
                  <h3 className="px-3 font-display text-[15px] text-gray-red/70">{group.title}</h3>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.path;
                      return (
                        <li key={item.path}>
                          <Button
                            variant="bare"
                            type="button"
                            onClick={() => navigate(item.path)}
                            aria-current={active ? "page" : undefined}
                            className={`w-full justify-start gap-2 rounded-full px-3 py-2 text-left text-[14px] transition-colors ${
                              active
                                ? "bg-crimson-light/45 font-bold text-berry"
                                : "text-gray-red hover:bg-crimson-light/25 hover:text-berry"
                            }`}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                              {active ? (
                                <Bow className="h-4 w-4 text-crimson" />
                              ) : (
                                <span className="h-1 w-1 rounded-full bg-crimson-light" />
                              )}
                            </span>
                            {item.label}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <Button type="button" className="mt-6 w-full rounded-full" onClick={logout}>
            Log out
          </Button>
        </aside>
      </div>
    </>
  );
};

export default SideBar;
