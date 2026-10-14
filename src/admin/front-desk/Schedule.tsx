"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import clsx from "clsx";
import AdminShell from "../../components/admin/AdminShell";
import AppointmentDetailsModal from "../../components/admin/AppointmentDetailsModal";
import ScheduleDayDetails from "../../components/admin/schedule/ScheduleDayDetails";
import ScheduleMonthGrid from "../../components/admin/schedule/ScheduleMonthGrid";
import ScheduleAgenda from "../../components/admin/ScheduleAgenda";
import ScheduleWeekGrid from "../../components/admin/ScheduleWeekGrid";
import { Button, LoadingBar, Select } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { useSchedule } from "../../hooks/admin/useSchedule";
import type { Appointment } from "../../services/appointmentService";
import { toDateKey } from "../../services/scheduleAgenda";

// The Schedule: a week grid on a computer (artists down the side, days across), a day agenda and
// a month grid on a phone. Its data and state are in hooks/admin/useSchedule.
export default function Schedule() {
  const s = useSchedule();

  if (s.isLoading) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading the schedule" />
      </div>
    );
  }

  const artistOptions = s.artistNames.map((artist) => (
    <option key={artist.id} value={artist.name}>
      {artist.name}
    </option>
  ));

  return (
    <AdminShell title="Schedule">
      <div className="flex flex-1 flex-col overflow-y-auto pb-2">
        {/* PHONE: Day | Month switch and the filter */}
        {!s.desktop && (
          <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
            <div role="group" aria-label="View" className="flex rounded-full border border-crimson-light p-0.5">
              {(["agenda", "month"] as const).map((view) => (
                <Button
                  key={view}
                  variant="bare"
                  type="button"
                  aria-pressed={s.phoneView === view}
                  onClick={() => s.showPhoneView(view)}
                  className={clsx("rounded-full px-4 py-1 text-[13px] font-medium transition-colors", s.phoneView === view ? "bg-crimson text-light-orange" : "text-gray-red")}
                >
                  {view === "agenda" ? "Day" : "Month"}
                </Button>
              ))}
            </div>
            <Button variant="secondary" type="button" onClick={() => s.setFilterOpen(true)} className="relative !px-3 !py-2">
              Filter
              {s.filterBy !== "All" && <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-crimson" />}
            </Button>
          </div>
        )}

        {/* PHONE: the agenda for one day */}
        {!s.desktop && s.phoneView === "agenda" && (
          <div className="lg:hidden">
            <ScheduleAgenda selected={s.agendaDate} onSelect={s.selectAgendaDate} dayData={s.dayData} onOpenAppointment={s.openAppointment} />
          </div>
        )}

        {/* DESKTOP: the week grid, artists down the side and the days across */}
        {s.desktop && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="bare" type="button" aria-label="Previous week" onClick={s.previousWeek} className="rounded-full p-1.5 text-gray-red hover:bg-crimson-light/30">
                  <ChevronLeft size={20} aria-hidden="true" />
                </Button>
                <h3 className="min-w-[12rem] text-center text-[16px] font-bold text-gray-red">{s.weekLabel}</h3>
                <Button variant="bare" type="button" aria-label="Next week" onClick={s.nextWeek} className="rounded-full p-1.5 text-gray-red hover:bg-crimson-light/30">
                  <ChevronRight size={20} aria-hidden="true" />
                </Button>
              </div>
              <Button variant="secondary" type="button" onClick={s.thisWeek} className="px-4! py-1.5!">
                Today
              </Button>
              <label className="relative ml-auto w-64">
                <span className="sr-only">Search clients or services</span>
                <input
                  type="search"
                  aria-label="Search clients or services"
                  value={s.query}
                  onChange={(e) => s.setQuery(e.target.value)}
                  placeholder="Search clients or services…"
                  className="h-9 w-full rounded-full border border-crimson-light bg-milk pl-9 pr-4 text-[13px] text-gray-red outline-none placeholder:text-gray-red/60 focus:ring-2 focus:ring-crimson"
                />
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-red/60" />
              </label>
              <Select className="w-48" aria-label="Service" value={s.service} onChange={(e) => s.setService(e.target.value)}>
                <option value="All">All Services</option>
                {s.serviceNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              {/* With the other filters, in one row */}
              <Select className="w-48" aria-label="Artist" value={s.filterBy} onChange={(e) => s.setFilterBy(e.target.value)}>
                <option value="All">All Artists</option>
                {artistOptions}
              </Select>
            </div>
            {s.scheduleData && (
              <ScheduleWeekGrid
                days={s.gridDays}
                schedule={s.scheduleData}
                todayKey={toDateKey(new Date())}
                query={s.query}
                service={s.service}
                artist={s.filterBy}
                onOpen={s.openAppointment}
                onOpenDay={s.openDay}
              />
            )}
          </div>
        )}

        {/* PHONE: the month grid, in the Month view */}
        {!s.desktop && (
          <div className={clsx("min-h-0 flex-1 flex-col", s.phoneView === "month" ? "flex" : "hidden")}>
            <ScheduleMonthGrid month={s.month} onMonthChange={s.setMonth} onPrevious={s.previousMonth} onNext={s.nextMonth} dayData={s.dayData} onOpenDate={s.openDate} />
          </div>
        )}
      </div>

      {s.selectedDate && s.selectedDateObject && (
        <ScheduleDayDetails date={s.selectedDate} artists={s.dayData(s.selectedDateObject)} onClose={s.closeDay} onOpenAppointment={s.openAppointment} />
      )}

      {s.selectedAppointment && (
        <AppointmentDetailsModal appointment={s.selectedAppointment as Appointment} onClose={s.closeAppointment} onStatusChange={s.changeAppointmentStatus} />
      )}

      <Dialog open={s.filterOpen} title="Filter schedule" onClose={() => s.setFilterOpen(false)}>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-red/80">Artist</p>
          <Select aria-label="Artist" value={s.filterBy} onChange={(e) => s.setFilterBy(e.target.value)}>
            <option value="All">All Artists</option>
            {artistOptions}
          </Select>
        </div>
        <Button type="button" fullWidth onClick={() => s.setFilterOpen(false)}>
          Done
        </Button>
      </Dialog>
    </AdminShell>
  );
}
