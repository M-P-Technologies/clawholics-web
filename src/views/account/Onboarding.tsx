"use client";

import { CalendarDays,ChevronDown } from "lucide-react";
import { Link } from "@/lib/router";
import { Button } from "@/components/atoms";
import PageHeader from "../../components/layout/PageHeader";
import PageShell from "../../components/layout/PageShell";
import Panel from "../../components/layout/Panel";
import Section from "../../components/layout/Section";
import FormField from "../../components/ui/FormField";
import { errorTextClass, inputClass, labelClass } from "@/components/tokens";
import { LoadingBar } from "@/components/atoms";
import { useOnboarding } from "../../hooks/useOnboarding";

export default function Onboarding() {
  const { toggleGender, genderLabel, nameFields, contactFields, isLoaded, isSubmitting, submitError, isChecking, isGenderOpen, formData, genderOptions, handleGenderSelect, handleDobChange, handleSubmit, maxDateString, isFutureDate, isSubmitDisabled, dangerRing, handleDatePick } = useOnboarding();

  if (!isLoaded || isChecking) {
    return <LoadingBar label="Loading your details" />;
  }

  return (
    <PageShell>
      <Section innerClassName="max-w-xl">
        <PageHeader
          align="center"
          title="Complete your profile"
          subtitle="Please fill in the details to get started."
        />

        <Panel>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {nameFields.map((field) => (
                <FormField key={field.id} {...field} />
              ))}
            </div>

            {contactFields.map((field) => (
              <FormField key={field.id} {...field} errorClass={dangerRing} />
            ))}

            <div>
              <label htmlFor="dob" className={labelClass}>
                Date of birth
              </label>
              <div className="relative flex items-center">
                <input
                  id="dob"
                  type="text"
                  name="dob"
                  autoComplete="bday"
                  placeholder="MM/DD/YYYY"
                  required
                  value={formData.dob}
                  onChange={handleDobChange}
                  maxLength={10}
                  className={`${inputClass} pr-12 ${isFutureDate ? dangerRing : ""}`}
                />

                <input
                  type="date"
                  aria-label="Pick date of birth from calendar"
                  max={maxDateString}
                  className="absolute right-0 z-20 h-full w-12 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  onChange={handleDatePick}
                />

                <CalendarDays
                  aria-hidden="true"
                  size={20} className="pointer-events-none absolute right-4 z-10 text-crimson"
                />
              </div>
              {isFutureDate && <p className={errorTextClass}>Date cannot be in the future.</p>}
            </div>

            <div>
              <span id="gender-label" className={labelClass}>
                Gender
              </span>
              <div className="relative">
                <Button
                  variant="bare"
                  type="button"
                  aria-labelledby="gender-label"
                  aria-haspopup="listbox"
                  aria-expanded={isGenderOpen}
                  onClick={toggleGender}
                  className={`${inputClass} flex items-center justify-between text-left`}
                >
                  <span className={genderLabel ? "" : "text-gray-red/50"}>{genderLabel || "Select gender"}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-5 w-5 text-crimson transition-transform duration-200 ${isGenderOpen ? "rotate-180" : ""}`}
                  />
                </Button>
                {isGenderOpen && (
                  <div
                    role="listbox"
                    aria-labelledby="gender-label"
                    className="absolute bottom-full z-30 mb-2 w-full overflow-hidden rounded-sm border border-crimson-light bg-light-orange py-1 shadow-xl shadow-crimson/20"
                  >
                    {genderOptions.map((option) => (
                      <div
                        key={option.value}
                        role="option"
                        aria-selected={formData.gender === option.value}
                        onClick={() => handleGenderSelect(option.value)}
                        className={`cursor-pointer px-4 py-4 transition-colors ${
                          formData.gender === option.value
                            ? "bg-crimson font-bold text-light-orange"
                            : "text-gray-red hover:bg-crimson-light/50"
                        }`}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full"
            >
              {isSubmitting ? "Saving..." : "Save & continue"}
            </Button>

            {submitError && (
              <p role="alert" className="text-center text-sm font-bold text-danger">
                {submitError}
              </p>
            )}

            <Link
              to="/"
              className="text-center text-sm text-gray-red underline transition-colors hover:text-crimson"
            >
              Back to home
            </Link>
          </form>
        </Panel>
      </Section>
    </PageShell>
  );
}
