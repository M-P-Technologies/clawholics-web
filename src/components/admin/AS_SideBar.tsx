import { useClerk } from "@clerk/nextjs";
import { Menu,X } from "lucide-react";
import { useEffect,useRef,useState } from "react";
import { useLocation,useNavigate } from "@/lib/router";
import Button from "../ui/Button";

const NAV_GROUPS = [
  {
    title: "Directories",
    items: [
      { path: "/AS_AdminDirectory", label: "Admin Directory" },
      { path: "/AS_ClientDirectory", label: "Client Directory" },
    ],
  },
  {
    title: "Content Management",
    items: [
      { path: "/AS_Homepage", label: "Homepage" },
      { path: "/AS_NailServices", label: "Services" },
      { path: "/AS_NailArtists", label: "Artists" },
      { path: "/AS_AboutUs", label: "About Us" },
      { path: "/AS_ContactUs", label: "Contact Us" },
      { path: "/AS_FAQs", label: "FAQs" },
      { path: "/AS_TermsAndConditions", label: "Terms & Conditions" },
    ],
  },
  {
    title: "Client Appointments",
    items: [
      { path: "/AS_Schedule", label: "Schedule" },
      { path: "/AS_Appointments", label: "Appointments" },
    ],
  },
  {
    title: "Tools",
    items: [{ path: "/AS_AdminScanner", label: "Admin Scanner" }],
  },
];

export const AS_SideBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const clerk = useClerk();

  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  const goTo = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const logout = async () => {
    try {
      setMenuOpen(false);
      await clerk.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [menuOpen]);

  const NavLinks = () => (
    <nav aria-label="Admin navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-4 flex flex-col gap-2">
          <h3 className="font-display text-sm font-normal uppercase tracking-extrawide text-gray-red/70">
            {group.title}
          </h3>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = pathname === item.path;
              return (
                <li key={item.path}>
                  <Button
                    variant="bare"
                    type="button"
                    onClick={() => goTo(item.path)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-4 py-1.5 text-left text-sm font-bold uppercase tracking-widest transition-colors hover:text-crimson ${
                      active ? "text-crimson" : "text-gray-red"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1 w-1 shrink-0 rounded-full transition-colors ${
                        active ? "bg-crimson" : "bg-crimson-light"
                      }`}
                    />
                    {item.label}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* SM-MD NAVBAR */}
      <div className="fixed left-0 right-0 top-0 z-50 w-screen border-b border-crimson-light/70 bg-light-orange/90 backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center gap-4 px-4">
          <Button
            variant="bare"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-1 text-gray-red"
            aria-label="Toggle admin navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </Button>

          <p className="font-display text-xl uppercase tracking-widest text-gray-red">Clawholics</p>
        </div>

        <div
          ref={navRef}
          className={`overflow-y-auto bg-light-orange transition-all duration-300 ease-in-out ${
            menuOpen ? "max-h-[calc(100vh-4rem)] px-4 pb-4 pt-2" : "max-h-0 px-4"
          }`}
        >
          <NavLinks />
          <div className="flex justify-center pb-2">
            <Button type="button" className="w-full" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer because the mobile navbar is fixed */}
      <div className="h-16 lg:hidden" />

      {/* LG+ SIDEBAR ONLY */}
      <aside className="mr-4 hidden h-full w-64 shrink-0 flex-col overflow-y-auto rounded-sm border border-crimson-light/80 bg-light-orange px-8 py-8 shadow-xl shadow-crimson/10 lg:flex">
        <p className="mb-8 text-center font-display text-3xl uppercase tracking-widest text-gray-red">
          Clawholics
        </p>

        <div className="flex-1">
          <NavLinks />
        </div>

        <Button type="button" className="mt-4 w-full" onClick={logout}>
          Log out
        </Button>
      </aside>
    </>
  );
};

export default AS_SideBar;
