import { Sidebar } from "@/components/layout/Sidebar";

/** Adds the property-scoped nav (Overview/Pages/Sources/Settings) around any /[trackingId]/* screen. */
export default async function TrackingPropertyLayout({ children, params }) {
  const { trackingId } = await params;

  return (
    <>
      <Sidebar trackingId={trackingId} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </>
  );
}
