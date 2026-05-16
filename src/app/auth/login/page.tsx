import { Suspense } from "react";

import TixsyAuthPage from "@/components/auth/TixsyAuthPage";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <TixsyAuthPage initialMode="login" />
    </Suspense>
  );
}

