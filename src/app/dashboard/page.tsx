import { PageWrapper } from "@/components/layout/PageWrapper";
import { Container } from "@/components/layout/Container";
import { OrganizerDashboardSections } from "@/components/sections/OrganizerDashboardSections";
export default function DashboardPage() {
  return (
    <PageWrapper>
      <Container>
        <h1 className="mb-6 text-2xl font-bold text-brand-700">Dashboard</h1>
        <OrganizerDashboardSections />
      </Container>
    </PageWrapper>
  );
}
