import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";

export async function POST(req: NextRequest) {
  try {
    const { eventId, quantity = 1 } = await req.json();

    await connectDB();
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: event.title },
            unit_amount: Math.round(event.price * 100), // cents
          },
          quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${event._id}`,
      metadata: {
        eventId: event._id.toString(),
        organizerId: event.organizerId.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 }
    );
  }
}
