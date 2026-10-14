"use client";

import { Button } from "../../atoms";
import { useToast } from "../../molecules";

// Showing a toast needs the provider's state, so the gallery's Toast section uses this button.
export default function ToastDemo() {
  const toast = useToast();
  return (
    <Button type="button" onClick={() => toast.show("success", "Saved", "This is a toast.")}>
      Show a toast
    </Button>
  );
}
