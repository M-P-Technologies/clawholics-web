import React, { useState, useEffect, useRef } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useNavigate } from "@/lib/router";
import { CLIENT_PATHS } from "../lib/client/clientNav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { updateProfile, isEmailTaken, type UserProfile } from "../services/userService";
import { accountKeys, accountQueries, isAdminProfile } from "@/lib/accountQueries";
import type { ChangeEvent } from "react";
import { ONBOARDING_CONTACT_FIELDS, ONBOARDING_NAME_FIELDS } from "../data/onboarding";
import { useToast } from "@/components/molecules";

export function useOnboarding() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  // Set once the form is on screen, and once it is saved; leaving in between earns a reminder
  const formShown = useRef(false);
  const saved = useRef(false);
  const toastRef = useRef(toast);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dob: "",
    gender: "",
  });

  // HARD ADMIN CHECK: Clerk metadata says admin, so the directory isn't asked
  const clerkAdmin = String(user?.publicMetadata?.role || "").toLowerCase() === "admin";
  // The cached profile the onboarding gate also reads (null for a new account)
  const profileQuery = useQuery({
    ...accountQueries.profile(user?.id ?? "", getToken),
    enabled: isLoaded && !!user && !clerkAdmin,
  });
  const existingProfile = profileQuery.data;
  // BACKEND ADMIN CHECK: in case Clerk metadata is not synced yet
  const isAdmin = clerkAdmin || isAdminProfile(existingProfile);
  // On error, the form shows (only once we are sure they aren't an admin)
  const isChecking =
    !isLoaded || !user || isAdmin || !!existingProfile?.onboarded || (existingProfile === undefined && !profileQuery.isError);

  useEffect(() => {
    if (isLoaded && user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
      }));
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (isAdmin) navigate("/dashboard", { replace: true });
    // Already onboarded (but not just now: the save goes to the profile itself)
    else if (existingProfile?.onboarded && !saved.current) navigate(CLIENT_PATHS.home, { replace: true });
  }, [isLoaded, user, isAdmin, existingProfile, navigate]);

  useEffect(() => {
    if (profileQuery.isError) console.error("Onboarding verification failed:", profileQuery.error);
  }, [profileQuery.isError, profileQuery.error]);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    formShown.current = !isChecking;
  }, [isChecking]);

  useEffect(() => {
    return () => {
      if (!formShown.current || saved.current) return;
      // In development React unmounts and remounts once on its own while still on this page, so
      // only warn when the user has really moved on to another one
      setTimeout(() => {
        if (window.location.pathname === "/onboarding") return;
        toastRef.current.show(
          "info",
          "Your profile isn't complete yet",
          "You can browse freely, but you'll need to finish it before you can book. You can do it any time from your profile.",
        );
      }, 0);
    };
  }, []);

  const genderOptions = [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "other", label: "Other" },
    { value: "prefer not to say", label: "Prefer not to say" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d+]/g, "");

    if (val.indexOf("+") > 0) {
      val = val.replace(/\+/g, "");
    }

    if (val.startsWith("+63")) {
      val = val.slice(0, 13);
    } else if (val.startsWith("09")) {
      val = val.slice(0, 11);
    } else if (val.startsWith("+")) {
      val = val.slice(0, 13);
    } else {
      val = val.slice(0, 11);
    }

    setFormData({ ...formData, phone: val });
  };

  const handleGenderSelect = (value: string) => {
    setFormData({ ...formData, gender: value });
    setIsGenderOpen(false);
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");

    if (val.length > 2 && val.length <= 4) {
      val = val.slice(0, 2) + "/" + val.slice(2);
    } else if (val.length > 4) {
      val = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4, 8);
    }

    setFormData({ ...formData, dob: val });
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    const currentPhone = formData.phone || "";

    const isValid09 =
      currentPhone.startsWith("09") && currentPhone.length === 11;
    const isValid63 =
      currentPhone.startsWith("+639") && currentPhone.length === 13;

    if (!isValid09 && !isValid63) {
      setPhoneError(
        "Please enter a valid Philippine phone number (e.g., 09xxxxxxxxx or +639xxxxxxxxx).",
      );
      return;
    }

    setPhoneError("");
    setSubmitError("");
    setIsSubmitting(true);

    try {
      let dbFormattedDate = formData.dob;
      const dateParts = formData.dob.split("/");
      if (dateParts.length === 3) {
        dbFormattedDate = `${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`;
      }

      const completeUserData = {
        clerk_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: currentPhone,
        dob: dbFormattedDate,
        gender: formData.gender,
        email: user.primaryEmailAddress?.emailAddress || "",
      };

      const token = await getToken();
      await updateProfile(user.id, completeUserData, token);
      saved.current = true;
      // The gate on the next page reads the cached profile: mark it finished at once, then
      // fetch the saved one behind it
      const key = accountKeys.profile(user.id);
      queryClient.setQueryData(key, (old: UserProfile | null | undefined) => ({ ...old, ...completeUserData, onboarded: true }) as UserProfile);
      void queryClient.invalidateQueries({ queryKey: key });
      toast.show("success", "Profile saved", "Thank you! You can now book appointments. You can change these details any time from your profile.");
      navigate(CLIENT_PATHS.home);
    } catch (error) {
      if (isEmailTaken(error)) {
        // Not a connection problem, so retrying won't help
        setSubmitError("This email is already used by another account, so your profile couldn't be saved. Please sign in with the account you registered with, or contact the studio.");
      } else {
        console.error("Failed to save profile", error);
        setSubmitError("We couldn't save your profile, so nothing was changed. Your answers are still in the form. Please check your connection and press the button again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const maxDateString = `${yyyy}-${mm}-${dd}`;

  let isFutureDate = false;
  if (formData.dob.length === 10) {
    const [month, day, year] = formData.dob.split("/");
    const typedDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (typedDate > today) {
      isFutureDate = true;
    }
  }

  const isSubmitDisabled =
    isSubmitting ||
    !formData.firstName.trim() ||
    !formData.lastName.trim() ||
    !formData.phone.trim() ||
    !formData.gender ||
    formData.dob.length !== 10 ||
    isFutureDate;

  const handlePhoneInput = (e: ChangeEvent<HTMLInputElement>) => {
    handlePhoneChange(e);
    setPhoneError("");
  };

  // The plain text inputs with everything they need: value, handler, error and whether they are locked
  const nameFields = ONBOARDING_NAME_FIELDS.map((field) => ({
    ...field,
    value: formData[field.name as "firstName" | "lastName"],
    onChange: handleChange,
  }));

  const contactFields = ONBOARDING_CONTACT_FIELDS.map((field) =>
    field.id === "email"
      ? { ...field, disabled: true, value: user?.primaryEmailAddress?.emailAddress || "" }
      : { ...field, value: formData.phone, onChange: handlePhoneInput, error: phoneError },
  );

  const dangerRing = "border-danger focus:border-danger focus:ring-danger/30";

  
  const handleDatePick = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split("-");
    setFormData({ ...formData, dob: `${m}/${d}/${y}` });
  };

  const genderLabel = genderOptions.find((option) => option.value === formData.gender)?.label ?? "";

  const toggleGender = () => setIsGenderOpen(!isGenderOpen);

  return { toggleGender, genderLabel, nameFields, contactFields, user, isLoaded, isSubmitting, phoneError, setPhoneError, submitError, isChecking, isGenderOpen, setIsGenderOpen, formData, setFormData, genderOptions, handleChange, handlePhoneChange, handleGenderSelect, handleDobChange, handleSubmit, maxDateString, isFutureDate, isSubmitDisabled, dangerRing, handlePhoneInput, handleDatePick };
}
