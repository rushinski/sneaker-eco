// app/admin/nexus/page.tsx
import NexusTrackerClient from "@/components/admin/nexus/NexusTrackerClient";

export const metadata = {
  title: "Nexus Settings | Admin",
  description: "Manage state nexus registrations",
};

export default function NexusPage() {
  return <NexusTrackerClient />;
}
