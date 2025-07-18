import { Container } from "@/components/layout/Container";
const faqs = [
  {
    q: "How do I buy a ticket?",
    a: "Browse events, choose your seat, and pay securely with your card.",
  },
  { q: "Can I get a refund?", a: "Refund policies depend on each organizer." },
  {
    q: "How do I become an organizer?",
    a: "Sign up and create your first event.",
  },
];
export function FAQ() {
  return (
    <section className="py-16">
      <Container>
        <h2 className="text-2xl font-bold text-brand-700">FAQ</h2>
        <div className="mt-8 space-y-4">
          {faqs.map((f, i) => (
            <details key={i} className="rounded-md border border-brand-200 p-4">
              <summary className="cursor-pointer text-brand-700">{f.q}</summary>
              <p className="mt-2 text-brand-600">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
