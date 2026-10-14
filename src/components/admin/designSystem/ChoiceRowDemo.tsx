"use client";

import { useState } from "react";
import { ChoiceRow } from "../../molecules";

// ChoiceRow needs state to show selecting, so the gallery's ChoiceRow section uses this.
export default function ChoiceRowDemo() {
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
