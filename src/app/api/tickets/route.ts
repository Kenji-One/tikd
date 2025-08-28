/* ------------------------------------------------------------------ */
/*  src/app/api/tickets/route.ts                                      */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import "@/lib/mongoose";
import { auth } from "@/lib/auth";
import Ticket, { ITicket } from "@/models/Ticket";
import { IEvent } from "@/models/Event";

/* ------------------------------------------------------------------ */
/*  Helper types                                                      */
/* ------------------------------------------------------------------ */

// Minimal event fields we need after populate()
type EventPreview = Pick<
  IEvent,
  "_id" | "title" | "date" | "image" | "location"
>;

// Ticket with populated event
type TicketWithEvent = Omit<ITicket, "eventId"> & { eventId: EventPreview };

/* ------------------------------------------------------------------ */
/*  GET /api/tickets?scope=self                                       */
/* ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "self";
  const status = searchParams.get("status"); // optional filter

  if (scope !== "self") {
    return NextResponse.json(
      { error: "Unsupported scope. Only scope=self is implemented." },
      { status: 400 }
    );
  }

  /* ------------- build query -------------------------------------- */
  const query: Record<string, unknown> = { ownerId: session.user.id };
  if (status) query.status = status;

  /* ------------- fetch tickets ------------------------------------ */
  const tickets = (await Ticket.find(query)
    .populate<{ eventId: EventPreview }>("eventId", "title date location image")
    .lean()) as TicketWithEvent[]; // <-- assert array type

  const shaped = tickets.map((t) => ({
    _id: t._id,
    eventId: t.eventId?._id,
    eventTitle: t.eventId?.title,
    eventDate: t.eventId?.date,
    eventImg: t.eventId?.image, // poster (always available)
    ticketImg: t.qrCode || null, // ticket-specific image (optional)
    price: t.price,
    currency: t.currency,
    quantity: 1,
    status: t.status,
    seat: t.seat ?? null,
  }));

  return NextResponse.json(shaped);
}

/* ------------------------------------------------------------------ */
/*  (Additional handlers can be added later)                          */
/* ------------------------------------------------------------------ */
