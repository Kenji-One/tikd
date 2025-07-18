import { Container } from "@/components/layout/Container";
import { Avatar } from "@/components/ui/Avatar";
const organizers = [
  { id: "1", name: "Music Live", img: "" },
  { id: "2", name: "Tech Stars", img: "" },
  { id: "3", name: "Art Lovers", img: "" },
];
export function FeaturedOrganizers() {
  return (
    <section className="bg-brand-50 py-16">
      <Container>
        <h2 className="text-2xl font-bold text-brand-700">
          Featured Organizers
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-8">
          {organizers.map((o) => (
            <div key={o.id} className="flex flex-col items-center gap-2">
              <Avatar alt={o.name} />
              <span className="text-sm font-medium text-brand-700">
                {o.name}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
