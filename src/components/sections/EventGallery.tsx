import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
export function EventGallery() {
  return (
    <section className="py-16">
      <Container>
        <h2 className="text-2xl font-bold text-brand-700">Event Gallery</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-40 bg-brand-100" />
          ))}
        </div>
      </Container>
    </section>
  );
}
