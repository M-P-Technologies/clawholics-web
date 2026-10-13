"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import NailServiceDropdown from "../components/admin/NailServiceDropdown";
import { fetchServices, type NailService } from "../services/serviceService";
import { LoadingBar } from "../components/ui/LoadingBar";
import { useAuth, useUser } from "@clerk/nextjs";
import CategoryPanel from "../components/admin/CategoryPanel";
import { fetchCategories, type ServiceCategory } from "../services/catalogService";
import { useToast } from "../components/ui/ToastProvider";

export default function NailServices() {
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
    <AdminShell title="Services">

        <div className="flex-1 overflow-y-auto pb-2">
          <div className="flex flex-col gap-4">
              <CategoryPanel
                categories={categories}
                tokenFetcher={getToken}
                clerkId={currentUser?.id}
                onChanged={loadCategories}
              />
              {services.map((service) => (
                <NailServiceDropdown
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

              <NailServiceDropdown
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
      
    </AdminShell>
  );
}