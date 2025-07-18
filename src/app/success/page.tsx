import { PageWrapper } from "@/components/layout/PageWrapper";
import { Container } from "@/components/layout/Container";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
export default function SuccessPage() {
  return (
    <PageWrapper>
      <Container className="text-center">
        <h1 className="text-3xl font-bold text-brand-700">
          Purchase Successful 🎉
        </h1>
        <p className="mt-4 text-brand-600">
          Your ticket details have been emailed to you.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to Home</Link>
        </Button>
      </Container>
    </PageWrapper>
  );
}
