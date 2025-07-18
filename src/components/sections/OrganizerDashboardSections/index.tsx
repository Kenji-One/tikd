import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

function MyEvents() {
  const events = [{ id: "1", title: "My Concert" }];
  return (
    <div className="space-y-4">
      {events.map((e) => (
        <Card key={e.id} className="flex items-center justify-between">
          <span>{e.title}</span>
          <Button size="sm" asChild>
            <Link href={`/events/${e.id}`}>View</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}

function CreateEvent() {
  return (
    <Card className="p-8 text-center">Event creation form coming soon…</Card>
  );
}

function Settings() {
  return <Card className="p-8">Settings TBD</Card>;
}

export function OrganizerDashboardSections() {
  return (
    <Tabs
      defaultId="events"
      tabs={[
        { id: "events", label: "My Events", content: <MyEvents /> },
        { id: "create", label: "Create Event", content: <CreateEvent /> },
        { id: "settings", label: "Settings", content: <Settings /> },
      ]}
    />
  );
}
