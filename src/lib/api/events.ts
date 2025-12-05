// src/lib/api/events.ts

export type EventWithMeta = {
  _id: string;
  title: string;
  description?: string;
  date: string; // ISO string from the API
  location: string;
  image?: string;
  minAge?: number;
  status: "published" | "draft";
  organization?: {
    _id: string;
    name: string;
    logo?: string;
    website?: string;
  };
  attendingCount?: number;
  attendeesPreview?: { _id: string; image?: string }[];
};

export async function fetchEventById(id: string): Promise<EventWithMeta> {
  const res = await fetch(`/api/events/${id}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to load event");
  }

  return (await res.json()) as EventWithMeta;
}
