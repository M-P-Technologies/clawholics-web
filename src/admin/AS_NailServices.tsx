"use client";

import { useEffect, useState } from "react";
import AS_SideBar from "../components/admin/AS_SideBar";
import AS_NailServiceDropdown from "../components/admin/AS_NailServiceDropdown";
import { fetchServices, type NailService } from "../services/serviceService";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";
import AS_CategoryPanel from "../components/admin/AS_CategoryPanel";
import { fetchCategories, type ServiceCategory } from "../services/catalogService";
import { useToast } from "../components/ui/ToastProvider";

export default function AS_NailServices() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [services, setServices] = useState<NailService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadServices = async () => {
    const data = await fetchServices();
    setServices(data);
  };
  const loadCategories = async () => {
    setCategories(await fetchCategories());
  };

  useEffect(() => {
    const loadInitialServices = async () => {
      try {
        await Promise.all([loadServices(), loadCategories()]);
      } catch (error) {
        console.error("Failed to fetch services:", error);
        toast.show("error", "Couldn't load the services", "We couldn't load the service list. Please refresh the page to try again.");
      } finally {
        setIsLoading(false);
      }
    };
  
    loadInitialServices();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading services" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen lg:h-screen px-2 py-2 sm:px-4 sm:py-4 bg-light-orange overflow-x-hidden">
      <AS_SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-4 pt-16 lg:pt-0">
        <header className="flex flex-col gap-4 w-full">
          <h3 className="text-sm text-gray-red/80">
            Welcome, Admin!
          </h3>

          <div className="flex flex-wrap justify-between items-center gap-4 w-full">
            <h3 className="font-display text-2xl font-normal uppercase leading-tight tracking-widest text-gray-red sm:text-3xl">
              Services
            </h3>
          </div>
        </header>

        <div className="flex-1 bg-light-orange rounded-sm sm:rounded-sm p-4 sm:p-4 overflow-y-auto border border-crimson-light/80">
          <div className="flex flex-col gap-4">
              <AS_CategoryPanel
                categories={categories}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
                onChanged={loadCategories}
              />
              {services.map((service) => (
                <AS_NailServiceDropdown
                  key={service.id}
                  service={service}
                  categories={categories}
                  tokenFetcher={getToken}
                  clerkId={currentUser?.id}
                  onServiceUpdated={async () => {
                    try {
                      await loadServices();
                    } catch (error) {
                      console.error("Failed to refresh services:", error);
                      toast.show("info", "Saved, but the list is out of date", "Your changes were saved. We couldn't refresh the list, so please reload the page to see them.");
                    }
                  }}
                  onServiceDeleted={(serviceId) =>
                    setServices((prev) =>
                      prev.filter((item) => item.id !== serviceId)
                    )
                  }
                />
              ))}

              <AS_NailServiceDropdown
                mode="create"
                categories={categories}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
                onServiceCreated={async () => {
                  try {
                    await loadServices();
                  } catch (error) {
                    console.error("Failed to refresh services:", error);
                    toast.show("info", "Created, but the list is out of date", "The service was created. We couldn't refresh the list, so please reload the page to see it.");
                  }
                }}
              />
            </div>
        </div>
      </div>
    </div>
  );
}