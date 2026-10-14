"use client";

import type { ReactNode } from "react";
import { CalendarDays, CalendarHeart, House, QrCode, Trash2, Wallet } from "lucide-react";
import { Avatar, Badge, Blush, Button, Card, Checkbox, IconButton, Input, LoadingBar, Pearls, Select, StarPicker, Stars } from "../components/atoms";
import { EditActions, EmptyState, FormField, SectionHeader, StatCard } from "../components/molecules";
import { CardFields, RowCard, RowCards, SideBar, TabBar, TableFrame, TopBar } from "../components/organisms";
import AdminShell from "../components/admin/AdminShell";
import ChoiceRowDemo from "../components/admin/designSystem/ChoiceRowDemo";
import SearchDemo from "../components/admin/designSystem/SearchDemo";
import PaginationDemo from "../components/admin/designSystem/PaginationDemo";
import SegmentedDemo from "../components/admin/designSystem/SegmentedDemo";
import TabsDemo from "../components/admin/designSystem/TabsDemo";
import SortableDemo from "../components/admin/designSystem/SortableDemo";
import ToastDemo from "../components/admin/designSystem/ToastDemo";
import DialogDemo from "../components/admin/designSystem/DialogDemo";

// Every shared component and its variants, for checking the look. Admins only; not in the sidebar.
export default function DesignSystem() {
  return (
    <AdminShell title="Design system">
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-10">
        <Group title="Atoms">
          <GallerySection title="Button">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="bare">Bare</Button>
            <Button disabled>Disabled</Button>
            <Button loading loadingText="Saving...">Save</Button>
          </GallerySection>
          <GallerySection title="Badge">
            {(["success", "warning", "danger", "info", "neutral", "brand"] as const).map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}
            <Badge dot="info" caps>Confirmed</Badge>
          </GallerySection>
          <GallerySection title="Card">
            <Card padding="sm">Milk card</Card>
            <Card tone="tint" padding="sm">Tint card</Card>
          </GallerySection>
          <GallerySection title="IconButton">
            <IconButton label="Plain" icon={Trash2} tone="plain" />
            <IconButton label="Milk" icon={Trash2} tone="milk" />
            <IconButton label="Brand" icon={Trash2} tone="brand" />
            <IconButton label="Small" icon={Trash2} size="sm" />
            <IconButton label="Disabled" icon={Trash2} disabled />
          </GallerySection>
          <GallerySection title="Avatar">
            <Avatar name="Ana Cruz" imageUrl="/bow.svg" />
            <Avatar name="Ana Maria Cruz" />
            <Avatar name="" />
            {(["sm", "md", "lg", "xl"] as const).map((size) => <Avatar key={size} name="Ana Cruz" size={size} />)}
          </GallerySection>
          <GallerySection title="Input">
            <Input aria-label="Demo" placeholder="Type…" />
            <Input aria-label="Demo disabled" placeholder="Disabled" disabled />
          </GallerySection>
          <GallerySection title="Checkbox">
            <label className="flex items-center gap-2 text-sm text-gray-red"><Checkbox defaultChecked /> Checked</label>
            <label className="flex items-center gap-2 text-sm text-gray-red"><Checkbox /> Unchecked</label>
          </GallerySection>
          <GallerySection title="Select">
            <Select aria-label="Example" value="a" onChange={() => {}}>
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </GallerySection>
          <GallerySection title="LoadingBar"><LoadingBar inline label="Loading" /></GallerySection>
          <GallerySection title="Blush"><div className="relative h-20 w-40 overflow-hidden rounded-xl"><Blush className="left-0 top-0 h-20 w-20" /></div></GallerySection>
          <GallerySection title="StarRating">
            <Stars rating={4} />
            <StarPicker value={3} onChange={() => {}} />
          </GallerySection>
          <GallerySection title="Pearls"><Pearls className="w-40" /></GallerySection>
        </Group>
        <Group title="Molecules">
          <GallerySection title="FormField">
            <div className="grid w-full max-w-md gap-4">
              <FormField id="ds-email" name="email" label="Email" type="email" value="ana@example.com" compact onChange={() => {}} />
              <FormField id="ds-email-error" name="email" label="Email" type="email" value="ana@example" compact error="Please check this address" onChange={() => {}} />
            </div>
          </GallerySection>
          <GallerySection title="ChoiceRow">
            <ChoiceRowDemo />
          </GallerySection>
          <GallerySection title="SearchBar">
            <SearchDemo />
          </GallerySection>
          <GallerySection title="Tabs">
            <TabsDemo />
          </GallerySection>
          <GallerySection title="SegmentedControl">
            <SegmentedDemo />
          </GallerySection>
          <GallerySection title="StatCard">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Wallet} label="Collected" value="₱2,000" change={{ kind: "up", label: "+20%" }} hint="downpayments received" />
              <StatCard size="hero" label="Estimated sales" value="₱12,500" hint="list price of completed services" />
              <StatCard size="compact" icon={CalendarHeart} label="Visits" value="4" hint="completed" />
            </div>
          </GallerySection>
          <GallerySection title="Pagination">
            <PaginationDemo />
          </GallerySection>
          <GallerySection title="Toast">
            <p className="text-sm text-gray-red">A short message that slides in at the bottom right and goes away on its own. Errors stay longer.</p>
            <ToastDemo />
          </GallerySection>
          <GallerySection title="EmptyState">
            <div className="grid gap-4 md:grid-cols-2">
              <EmptyState kind="error" title="It failed" message="Something went wrong. Please try again." />
              <EmptyState kind="empty" title="Nothing yet" message="Book a visit to see it here." />
              <EmptyState kind="success" title="All done" message="Your changes were saved." />
              <EmptyState kind="info" title="Good to know" message="Bookings close one day ahead." />
            </div>
          </GallerySection>
          <GallerySection title="SortableList"><SortableDemo /></GallerySection>
          <GallerySection title="EditActions">
            <div className="flex flex-col gap-4">
              <EditActions isEditing={false} isSaving={false} onEdit={() => {}} onCancel={() => {}} onSave={() => {}} onDelete={() => {}} />
              <EditActions isEditing isSaving={false} onEdit={() => {}} onCancel={() => {}} onSave={() => {}} />
            </div>
          </GallerySection>
          <GallerySection title="SectionHeader">
            <div className="flex flex-col gap-6">
              <SectionHeader level={3} title="Page title" subtitle="A short line under the page's heading." />
              <SectionHeader size="section" title="Section with an action" action={<a href="#section-header">See all</a>} />
              <SectionHeader size="card" icon={QrCode} title="Card title" />
            </div>
          </GallerySection>
        </Group>
        <Group title="Organisms">
          <GallerySection title="Dialog">
            <DialogDemo />
          </GallerySection>
          <GallerySection title="TopBar">
            <TopBar title="Example" greeting="Welcome, Ana!" today="Wednesday, Oct 14" account={{ name: "Ana Cruz", email: "ana@example.com", imageUrl: "" }} />
          </GallerySection>
          <GallerySection title="SideBar">
            <div className="h-[480px]">
              <SideBar label="Demo menu" groups={DEMO_NAV} storageKey="ds-rail" footer={() => null} />
            </div>
          </GallerySection>
          <GallerySection title="TabBar">
            <div className="relative h-24 [&_nav]:static lg:[&>div]:!block">
              <TabBar label="Demo tabs" items={DEMO_NAV[0].items} />
            </div>
          </GallerySection>
          <GallerySection title="AppShell">
            <p className="text-sm text-gray-red">
              The frame of a signed-in area: the sidebar on computers, the bottom tab bar on phones and the content. Live examples: the{" "}
              <a href="/dashboard" className="underline">admin</a> and the <a href="/my" className="underline">client app</a>.
            </p>
          </GallerySection>
          <GallerySection title="DataTable">
            <TableFrame label="Example bookings" minWidthClass="min-w-[480px]" head={<tr className="text-left text-[12px] text-gray-red/70"><th scope="col" className="pb-2 pr-3 font-medium">Client</th><th scope="col" className="pb-2 pr-3 font-medium">When</th></tr>}>
              <tr><th scope="row" className="py-2 pr-3 text-left font-normal">Ana</th><td className="py-2 pr-3">Oct 20</td></tr>
              <tr><th scope="row" className="py-2 pr-3 text-left font-normal">Bea</th><td className="py-2 pr-3">Oct 22</td></tr>
            </TableFrame>
            <p className="mt-4 text-sm text-gray-red">The same rows as cards, which phones show instead of the table.</p>
            <RowCards label="Example cards">
              <RowCard><CardFields fields={[["Client", "Ana"], ["When", "Oct 20"]]} /></RowCard>
              <RowCard><CardFields fields={[["Client", "Bea"], ["When", "Oct 22"]]} /></RowCard>
            </RowCards>
          </GallerySection>
        </Group>
      </div>
    </AdminShell>
  );
}

const DEMO_NAV = [{ title: "Group", items: [{ path: "/design-system", label: "Home", icon: House }, { path: "/demo-b", label: "Schedule", icon: CalendarDays }] }];

function Group({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-4">
      <h2 id={`ds-${title}`} className="font-display text-2xl font-normal normal-case tracking-normal text-gray-red">{title}</h2>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

export function GallerySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <h3 id={`ds-${title}`} className="text-[13px] font-bold uppercase tracking-wide text-gray-red/70">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}
