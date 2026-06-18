"use client";
import { Suspense } from "react";
import { CreatePasswordScreen } from "@/components/screens/CreatePasswordScreen";

export default function Page() {
  // useSearchParams (inside the screen) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CreatePasswordScreen />
    </Suspense>
  );
}
