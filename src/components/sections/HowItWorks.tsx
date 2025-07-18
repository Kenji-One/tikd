import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
const steps = [
  { id: 1, title: "Browse", text: "Find events that excite you." },
  { id: 2, title: "Purchase", text: "Securely buy tickets in seconds." },
  { id: 3, title: "Enjoy", text: "Show up and have fun!" },
];
export function HowItWorks() {
  return (
    <section className="bg-brand-50 py-16">
      <Container>
        <h2 className="text-2xl font-bold text-brand-700">How It Works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.id} className="text-center">
              <span className="text-4xl font-bold text-brand-500">{s.id}</span>
              <h3 className="mt-2 text-lg font-semibold text-brand-700">
                {s.title}
              </h3>
              <p className="mt-2 text-brand-600">{s.text}</p>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
