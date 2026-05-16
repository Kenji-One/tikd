import { Suspense } from "react";

import TixsyAuthPage from "@/components/auth/TixsyAuthPage";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <TixsyAuthPage initialMode="register" />
    </Suspense>
  );
}

