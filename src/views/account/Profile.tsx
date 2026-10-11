"use client";

import { QRCodeSVG } from "qrcode.react";
import React from "react";
import FormField from "../../components/ui/FormField";
import Button from "../../components/ui/Button";
import PageShell from "../../components/layout/PageShell";
import Section from "../../components/layout/Section";
import { inputClass } from "../../components/ui/styles";
import { LoadingBar } from "../../components/ui/LoadingBar";
import PaymentProofCard from "../../components/payment/PaymentProofCard";
import { useProfile } from "../../hooks/useProfile";
import { themeColor } from "../../services/themeColor";
import Select from "../../components/ui/Select";

export default function Profile() {
  const { toggleGender, toggleHistory, closeRewardModal, loyaltyCardNumber, isBusy, genderLabel, history, hasMoreHistory, noHistory, stampCells, isLateCancellation, selectedApptDateLabel, profileFields, clerkUser, getToken, highlightedAppointmentId, activeTab, setActiveTab, dbUser, isEditing, formData, error, stamps, isGenderOpen, showRewardModal, selectedAppt, isCancelModalOpen, actionError, currentTime, showAllHistory, isCancelling, historySortBy, historyFilter, todayFormatted, handleEditClick, genderOptions, handleGenderSelect, openDropdownId, handleSave, handleCancel, handleClientRedeem, handleCancelAppointment, currentAppointments, toggleAppointmentMenu, payForAppointment, rescheduleAppointment, startCancel, closeCancelModal, handleProofUploaded, handleHistoryFilterChange, handleHistorySortChange } = useProfile();

  if (isBusy || !dbUser) {
    return <LoadingBar label="Loading your profile" />;
  }
  return (
    <>
      <PageShell>
      <Section innerClassName="max-w-5xl gap-4 md:gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl uppercase tracking-widest text-gray-red md:text-5xl wrap-break-words">
            {dbUser.first_name} {dbUser.last_name}
          </h1>
          <p className="opacity-80 text-sm md:text-base">
            Member since {dbUser.member_since_month} {dbUser.member_since_year}
          </p>
        </div>

        {/* Navigation Tabs*/}
        <div className="flex w-max max-w-full snap-x overflow-x-auto no-scrollbar border-b border-crimson-light/80">
          <Button
            variant="bare"
            onClick={() => setActiveTab("details")}
            className={`whitespace-nowrap shrink-0 snap-start -mb-px border-b-2 px-4 py-4 text-sm font-bold uppercase tracking-extrawide transition-colors md:px-8 md:text-sm ${
              activeTab === "details"
                ? "border-crimson text-crimson"
                : "border-transparent text-gray-red hover:text-crimson"
            }`}
          >
            My Details
          </Button>
          <Button
            variant="bare"
            onClick={() => setActiveTab("schedule")}
            className={`whitespace-nowrap shrink-0 snap-start -mb-px border-b-2 px-4 py-4 text-sm font-bold uppercase tracking-extrawide transition-colors md:px-8 md:text-sm ${
              activeTab === "schedule"
                ? "border-crimson text-crimson"
                : "border-transparent text-gray-red hover:text-crimson"
            }`}
          >
            My Schedule
          </Button>
          <Button
            variant="bare"
            onClick={() => setActiveTab("loyalty")}
            className={`whitespace-nowrap shrink-0 snap-start -mb-px border-b-2 px-4 py-4 text-sm font-bold uppercase tracking-extrawide transition-colors md:px-8 md:text-sm ${
              activeTab === "loyalty"
                ? "border-crimson text-crimson"
                : "border-transparent text-gray-red hover:text-crimson"
            }`}
          >
            Loyalty Card
          </Button>
        </div>

        {/* TAB 1: My Details */}
        {activeTab === "details" && (
          <div className="flex flex-col gap-4 rounded-sm border border-crimson-light/80 bg-light-orange p-4 shadow-xl shadow-crimson/10 md:gap-8 md:p-8">
            <div className="flex flex-row justify-between items-center gap-4">
              <h3 className="font-display text-xl font-normal uppercase tracking-widest text-gray-red md:text-2xl">
                Personal Information
              </h3>
              {!isEditing ? (
                <Button
                  variant="secondary"
                  onClick={handleEditClick}
                  className="md:px-8"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex flex-row gap-2 md:gap-4 w-auto">
                  <Button
                    onClick={handleSave}
                    className="md:px-8"
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    className="md:px-8"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-danger/10 border border-danger rounded-sm text-danger text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-x-12 md:gap-y-8">
              {profileFields.map((field) => (
                <FormField key={field.id} {...field} />
              ))}

              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold uppercase tracking-widest text-gray-red">Gender:</p>
                {!isEditing ? (
                  <p className="opacity-80 capitalize">{dbUser.gender}</p>
                ) : (
                  <div className="relative">
                    <Button
                      variant="bare"
                      type="button"
                      onClick={toggleGender}
                      className={`${inputClass} flex items-center justify-between text-left`}
                    >
                      <span className={genderLabel ? "" : "opacity-60"}>{genderLabel || "Select gender"}</span>
                      <svg
                        className={`w-5 h-5 fill-current opacity-80 transition-transform duration-200 ${
                          isGenderOpen ? "rotate-180" : ""
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </Button>

                    {isGenderOpen && (
                      <div className="absolute z-10 w-full bottom-full mb-2 bg-light-orange border border-crimson-light rounded-sm shadow-xl shadow-crimson/20 overflow-hidden py-1">
                        {genderOptions.map((option) => (
                          <div
                            key={option.value}
                            onClick={() => handleGenderSelect(option.value)}
                            className={`px-4 py-4 cursor-pointer transition-colors font-sans ${
                              formData?.gender === option.value
                                ? "bg-crimson text-light-orange font-bold"
                                : "hover:bg-crimson-light/50 text-gray-red"
                            }`}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: My Schedule */}
        {activeTab === "schedule" && (
          <div className="flex flex-col gap-4 rounded-sm border border-crimson-light/80 bg-light-orange p-4 shadow-xl shadow-crimson/10 md:gap-8 md:p-8">
            {/* SECTION 1: CURRENT APPOINTMENTS */}
            <div className="flex flex-col gap-4 md:gap-8">
              <h3 className="border-b border-crimson-light/80 pb-2 text-sm font-bold uppercase tracking-widest text-gray-red">
                Current Appointments
              </h3>

              <div className="flex flex-col gap-4">
                {currentAppointments.length === 0 ? (
                  <p className="rounded-sm border border-crimson-light/80 bg-light-orange p-4 text-sm text-gray-red/80 md:text-base">
                    You have no upcoming appointments.
                  </p>
                ) : (
                  currentAppointments.map(
                    ({ appt, canReschedule, canCancel, statusLabel, statusDot, dateLabel, timeLabel, canPay, payLabel, isLocked }) => (
                        <React.Fragment key={appt.id}>
                        <div
                          className="
                            rounded-sm border border-crimson-light/80 bg-light-orange p-4 md:p-8 flex flex-col gap-4 md:flex-row md:justify-between md:items-center relative shadow-xl shadow-crimson/10
                          "
                        >
                          {/* LEFT SIDE: Appointment Info */}
                          <div className="flex flex-col gap-2 min-w-0 flex-1">
                            <h4 className="font-bold text-lg md:text-xl text-gray-red truncate">
                              {appt.service_name}
                            </h4>
                            <p className="opacity-70 text-sm md:text-base text-gray-red truncate">
                              With {appt.nailist_name}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-8 text-sm md:text-base text-gray-red opacity-80">
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 sm:w-5 sm:h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="18"
                                    rx="2"
                                    ry="2"
                                  ></rect>
                                  <line x1="16" y1="2" x2="16" y2="6"></line>
                                  <line x1="8" y1="2" x2="8" y2="6"></line>
                                  <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span>{dateLabel}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 sm:w-5 sm:h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>{timeLabel}</span>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT SIDE: Status Badge & 3-Dots Menu */}
                          <div
                            className="
                              flex items-center justify-between
                              md:justify-end
                              gap-4 md:gap-4
                              w-full md:w-auto
                            "
                          >
                            <span
                              className="
                                flex items-center gap-2
                                border border-crimson-light text-gray-red rounded-md px-4 md:px-4 py-1.5
                                text-[11px] sm:text-[13px]
                                font-bold uppercase
                                whitespace-nowrap shrink-0
                              "
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${statusDot} shadow-sm`}
                              ></span>
                              {statusLabel}
                            </span>

                            <div className="relative" data-appointment-menu>
                              <Button
                                variant="bare"
                                aria-label="Appointment options"
                                aria-haspopup="menu"
                                aria-expanded={openDropdownId === appt.id}
                                onClick={(e) => toggleAppointmentMenu(e, appt.id)}
                                className="p-2 text-gray-red hover:bg-light-orange/40 rounded-full transition-colors flex items-center justify-center"
                              >
                                <svg
                                  width="24"
                                  height="6"
                                  viewBox="0 0 24 6"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle cx="3" cy="3" r="3" />
                                  <circle cx="12" cy="3" r="3" />
                                  <circle cx="21" cy="3" r="3" />
                                </svg>
                              </Button>

                              {openDropdownId === appt.id && (
                                <div
                                  className="absolute right-0 mt-2 w-56 bg-light-orange border border-crimson-light rounded-sm shadow-xl shadow-crimson/20 z-10 overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {canPay && (
                                      <Button
                                        variant="bare"
                                        onClick={() => payForAppointment(appt)}
                                        className="block w-full text-left px-4 py-4 hover:bg-warning/15 text-warning font-bold text-sm border-b border-crimson/10 transition-colors"
                                      >
                                        Complete Payment ({payLabel})
                                      </Button>
                                    )}

                                  {canReschedule && (
                                    <Button
                                      variant="bare"
                                      onClick={() => rescheduleAppointment(appt)}
                                      className="block w-full text-left px-4 py-4 hover:bg-crimson-light/40 text-gray-red font-bold text-sm transition-colors"
                                    >
                                      Reschedule
                                    </Button>
                                  )}

                                  {canCancel && (
                                    <Button
                                      variant="bare"
                                      onClick={() => startCancel(appt)}
                                      className="block w-full text-left px-4 py-4 hover:bg-danger/10 text-danger font-bold text-sm transition-colors"
                                    >
                                      Cancel / Refund
                                    </Button>
                                  )}

                                  {isLocked && (
                                      <p className="block w-full text-left px-4 py-4 text-gray-red/50 italic text-sm border-t border-crimson/10">
                                        Rescheduling locked
                                      </p>
                                    )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <PaymentProofCard
                          appointment={appt}
                          now={currentTime}
                          tokenFetcher={getToken}
                          clerkId={clerkUser?.id}
                          highlighted={appt.id === highlightedAppointmentId}
                          onUploaded={(proof) => handleProofUploaded(appt.id, proof)}
                        />
                        </React.Fragment>
                    ),
                  )
                )}
              </div>
            </div>

            {/* SECTION 2: PAST / OTHER APPOINTMENTS */}
            <div className="flex flex-col gap-4 md:gap-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-crimson-light/80 pb-4">
                <h3 className="m-0 text-sm font-bold uppercase tracking-widest text-gray-red">
                  Past & Cancelled Appointments
                </h3>

                <div className="flex flex-row flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                  <Select
                    value={historyFilter}
                    onChange={handleHistoryFilterChange}
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </Select>

                  <Select
                    value={historySortBy}
                    onChange={handleHistorySortChange}
                  >
                    <option value="appointmentDateDesc">
                      Appt Date (Newest)
                    </option>
                    <option value="appointmentDateAsc">
                      Appt Date (Oldest)
                    </option>
                    <option value="bookingDateDesc">Recently Booked</option>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {noHistory ? (
                  <p className="rounded-sm border border-crimson-light/80 bg-light-orange p-4 text-sm text-gray-red/80 md:text-base">
                    No history matches your filters.
                  </p>
                ) : (
                  history.map(({ appt, dateLabel, timeLabel, statusDot }) => (
                      <div
                        key={appt.id}
                        className="bg-transparent border border-crimson-light/80 rounded-sm p-4 md:p-4 flex flex-row justify-between items-center opacity-80 hover:opacity-100 hover:bg-crimson-light/10 transition-all"
                      >
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-base md:text-lg text-gray-red">
                            {appt.service_name}
                          </h4>
                          <p className="opacity-70 text-sm md:text-sm text-gray-red">
                            With {appt.nailist_name} •{" "}
                            {dateLabel} • {timeLabel}
                          </p>
                        </div>
                        <span className="flex items-center gap-1.5 border border-crimson-light text-gray-red rounded-md px-4 py-1 text-[11px] font-bold uppercase whitespace-nowrap">
                          <span
                            className={`w-2 h-2 rounded-full ${statusDot} shadow-sm`}
                          ></span>
                          {appt.status}
                        </span>
                      </div>
                    ))
                )}
              </div>

              {/* VIEW MORE BUTTON */}
              {hasMoreHistory && (
                <Button
                  variant="bare"
                  onClick={toggleHistory}
                  className="w-full rounded-md border border-crimson-light py-4 text-sm font-bold uppercase tracking-extrawide text-gray-red transition-colors hover:border-crimson hover:text-crimson"
                >
                  {showAllHistory ? "Show Less" : "View Full History"}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Loyalty Card */}
        {activeTab === "loyalty" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-stretch">
            <div
              onClick={handleClientRedeem}
              className={`flex flex-col h-full rounded-sm border overflow-hidden shadow-xl shadow-crimson/10 transition-all duration-300 ${
                stamps >= 10
                  ? "bg-crimson-light/30 border-crimson cursor-pointer hover:scale-[1.02] hover:shadow-md"
                  : "bg-light-orange border-crimson-light/80"
              }`}
            >
              <div className="bg-crimson p-4 sm:p-8 flex flex-col gap-1">
                <h3 className="text-lg sm:text-xl md:text-lg lg:text-xl xl:text-2xl font-bold text-light-orange font-sans tracking-tight">
                  Clawholics Loyalty Card
                </h3>
                <p className="opacity-90 text-light-orange font-sans text-sm md:text-sm break-all">
                  {loyaltyCardNumber}
                </p>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <p className="text-sm font-bold text-gray-red flex items-center gap-2">
                  Stamp Card — {stamps}/10
                </p>

                <div className="grid grid-cols-5 gap-2 md:gap-4 w-full">
                  {stampCells.map(({ number, isEarned }) => {
                    return (
                      <div
                        key={number}
                        className={`aspect-square flex items-center justify-center rounded-sm font-bold text-base md:text-lg transition-all duration-300 ${
                          isEarned
                            ? "bg-crimson text-light-orange border border-crimson scale-105 shadow-sm"
                            : "bg-light-orange text-gray-red border border-crimson-light"
                        }`}
                      >
                        {number}
                      </div>
                    );
                  })}
                </div>

                {stamps >= 10 ? (
                  <p className="text-sm font-bold text-gray-red text-center animate-pulse">
                    You have 10 stamps! Tap this card to redeem!
                  </p>
                ) : (
                  <p className="text-sm text-gray-red/80 text-center">
                    {10 - stamps} more visit{10 - stamps !== 1 ? "s" : ""} to
                    earn a reward!
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-8 h-full bg-light-orange rounded-sm border border-crimson-light/80 p-4 sm:p-8 items-center justify-center text-center text-gray-red shadow-xl shadow-crimson/10">
              <h3 className="text-lg sm:text-xl md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight">
                Your QR Code
              </h3>

              <div className="p-4 sm:p-4 bg-light-orange rounded-sm border border-crimson-light w-40 sm:w-48 md:w-40 lg:w-48 xl:w-56 aspect-square flex items-center justify-center">
                <QRCodeSVG
                  value={JSON.stringify({
                    userId: clerkUser?.id,
                    action: "stamp",
                  })}
                  size={256}
                  style={{ height: "100%", width: "100%" }}
                  bgColor={themeColor("light-orange")}
                  fgColor={themeColor("gray-red")}
                  level="H"
                />
              </div>

              <p className="text-sm sm:text-sm md:text-sm lg:text-sm opacity-80 max-w-[16rem]">
                Show this QR code at the salon to earn stamps and redeem
                rewards.
              </p>
            </div>
          </div>
        )}
      </Section>
      </PageShell>

      {/* THE REWARD MODAL */}
      {showRewardModal && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 sm:px-8 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-8 md:p-12 max-w-2xl w-full text-center text-gray-red shadow-2xl relative flex flex-col items-center gap-4 md:gap-8 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="font-display text-3xl font-normal uppercase tracking-widest text-gray-red md:text-4xl">
              Congratulations, {dbUser?.first_name}!
            </h1>
            <p className="font-sans text-base md:text-xl opacity-90">
              You just completed your stamp card on{" "}
              <span className="font-bold">{todayFormatted}</span>!
            </p>
            <p className="font-sans text-sm md:text-xl opacity-80">
              You received a 30% off discount your next appointment! Please check your email to view the official confirmation for your reward. 
              You may show this message or the email to a staff member to claim your discount on your next visit.
            </p>
            <Button
              onClick={closeRewardModal}
              className="px-8 sm:px-12"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION MODAL */}
      {isCancelModalOpen && selectedAppt && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-gray-red/40 backdrop-blur-sm px-4 drawer-backdrop max-sm:p-0">
          <div className="bg-light-orange border border-crimson-light rounded-sm p-8 md:p-8 max-w-md w-full text-gray-red shadow-xl flex flex-col gap-4 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none">
            <h1 className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red">Cancel appointment?</h1>
            <p className="opacity-80">
              Are you sure you want to cancel your appointment for{" "}
              <strong>{selectedAppt.service_name}</strong> on{" "}
              <strong>
                {selectedApptDateLabel}
              </strong>
              ?
            </p>

            {isLateCancellation ? (
              <div className="bg-danger/10 border-l-4 border-danger text-gray-red p-4 text-sm text-left rounded-r-sm">
                <strong>Late Cancellation</strong>
                <br />
                This is within 3 days of your appointment. Per our salon policy,
                this cancellation is non-refundable. If you proceed, your slot
                will be forfeited.
              </div>
            ) : (
              <p className="text-sm italic text-gray-red">
                Note: Cancellations must be made at least 3 days in advance to
                be eligible for a refund.
              </p>
            )}

            {actionError && (
              <div className="p-4 bg-danger/10 border border-danger/40 text-danger rounded text-sm">
                {actionError}
              </div>
            )}

            <div className="flex flex-row justify-end gap-4">
              <Button
                variant="bare"
                onClick={closeCancelModal}
                disabled={isCancelling}
                className={`px-4 py-2 rounded-md border border-crimson text-sm uppercase tracking-widest font-bold ${
                  isCancelling
                    ? "opacity-30 cursor-not-allowed"
                    : "opacity-70 hover:bg-crimson-light"
                }`}
              >
                Back
              </Button>
              <Button
                variant="bare"
                onClick={handleCancelAppointment}
                disabled={isCancelling}
                className={`px-4 py-2 rounded-md text-sm uppercase tracking-widest font-bold shadow-md transition-colors ${
                  isCancelling
                    ? "bg-crimson/30 text-light-orange cursor-wait"
                    : "bg-crimson text-light-orange hover:bg-crimson/80"
                }`}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
