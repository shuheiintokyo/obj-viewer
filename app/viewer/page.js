// This file is intentionally a Server Component (no "use client").
// Route segment config like `dynamic` is only honored by Next.js when
// exported from a Server Component — it was silently ignored when this
// same export lived in the Client Component file, which meant Vercel could
// serve a cached copy of this page without ever re-checking login status.
// This thin wrapper enforces "always dynamic, never cached" at the route
// level, then renders the actual client-side viewer.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ViewerClient from "./ViewerClient";

export default function ViewerPage() {
  return <ViewerClient />;
}