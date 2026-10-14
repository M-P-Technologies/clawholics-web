"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Avatar, Badge, Blush, Button, Card, Checkbox, IconButton, Input, LoadingBar, Pearls, Select, StarPicker, Stars } from "../components/atoms";
import { ChoiceRow, FormField } from "../components/molecules";
import AdminShell from "../components/admin/AdminShell";
import ToastDemo from "../components/admin/designSystem/ToastDemo";

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
            <ChoiceRows />
          </GallerySection>
          <GallerySection title="Toast">
            <p className="text-sm text-gray-red">A short message that slides in at the bottom right and goes away on its own. Errors stay longer.</p>
            <ToastDemo />
          </GallerySection>
        </Group>
        <Group title="Organisms">{/* Task 11+ */}</Group>
      </div>
    </AdminShell>
  );
}

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

function ChoiceRows() {
  const [plan, setPlan] = useState("a");
  const [agree, setAgree] = useState(false);
  return (
    <div className="grid w-full max-w-md gap-2">
      <ChoiceRow selected={plan === "a"} onClick={() => setPlan("a")} trailing="PHP 500">Gel polish</ChoiceRow>
      <ChoiceRow selected={plan === "b"} onClick={() => setPlan("b")} trailing="PHP 800">Soft gel extensions</ChoiceRow>
      <ChoiceRow kind="checkbox" selected={agree} onClick={() => setAgree(!agree)}>I agree to the terms and conditions</ChoiceRow>
    </div>
  );
}
