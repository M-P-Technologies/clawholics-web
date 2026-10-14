"use client";

import { useState } from "react";
import { Button } from "@/components/atoms";
import { AlertDialog, ConfirmDialog, Dialog, FeedbackDialog } from "@/components/organisms";

type Which = "sheet" | "center" | "drawer" | "confirm" | "alert" | "feedback" | null;

// A dialog needs its open state, so the gallery's Dialog section uses these buttons.
export default function DialogDemo() {
  const [open, setOpen] = useState<Which>(null);
  const close = () => setOpen(null);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen("sheet")}>Sheet</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen("center")}>Centre</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen("drawer")}>Drawer</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen("confirm")}>Confirm</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen("alert")}>Alert</Button>
      <Button type="button" variant="secondary" onClick={() => setOpen("feedback")}>Feedback</Button>
      <Dialog open={open === "sheet"} onClose={close} title="Sheet">
        <p className="text-sm text-gray-red">From the bottom on phones, centred from lg.</p>
      </Dialog>
      <Dialog open={open === "center"} onClose={close} title="Centred" placement="center" size="md">
        <p className="text-sm text-gray-red">Centred on every screen.</p>
      </Dialog>
      <Dialog open={open === "drawer"} onClose={close} title="Drawer" placement="drawer">
        <p className="p-5 text-sm text-gray-red">Slides in from the right.</p>
      </Dialog>
      <ConfirmDialog open={open === "confirm"} onClose={close} onConfirm={close} title="Delete it?" confirmLabel="Delete" loadingLabel="Deleting...">
        This cannot be undone.
      </ConfirmDialog>
      <AlertDialog open={open === "alert"} onClose={close} onAction={close} title="Heads up" message="Something needs your attention." buttonText="Got it" />
      <FeedbackDialog open={open === "feedback"} onClose={close} title="Saved" message="Your changes were saved." isError={false} />
    </>
  );
}
