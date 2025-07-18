import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const events = [
  {
    id: "1",
    title: "Summer Music Festival",
    date: "2025-08-01",
    location: "Tbilisi",
    price: 49,
  },
  {
    id: "2",
    title: "Startup Meetup",
    date: "2025-07-20",
    location: "Batumi",
    price: 0,
  },
  {
    id: "3",
    title: "Art Expo",
    date: "2025-09-05",
    location: "Kutaisi",
    price: 15,
  },
];

export function UpcomingEvents() {
  return (
    <section id="upcoming" className="py-16">
      <Container>
        <h2 className="text-2xl font-bold text-brand-700">Upcoming Events</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-700">
                  {e.title}
                </h3>
                <p className="mt-1 text-sm text-brand-500">
                  {new Date(e.date).toLocaleDateString()} – {e.location}
                </p>
              </div>
              <Button asChild className="mt-4 w-full">
                <Link href={`/events/${e.id}`}>Buy from ${e.price}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
