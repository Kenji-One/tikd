import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
export function CTA() {
  return (
    <section className="bg-brand-500 py-16 text-center text-white">
      <Container>
        <h2 className="text-3xl font-bold">Ready to host your own event?</h2>
        <p className="mx-auto mt-2 max-w-md text-brand-50">
          Join hundreds of organizers using Tikd. to manage their events.
        </p>
        <Button
          asChild
          variant="ghost"
          className="mt-6 bg-white text-brand-600"
        >
          <Link href="/dashboard">Get Started</Link>
        </Button>
      </Container>
    </section>
  );
}
