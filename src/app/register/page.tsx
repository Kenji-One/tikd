import { PageWrapper } from "@/components/layout/PageWrapper";
import { Container } from "@/components/layout/Container";
import { AuthForm } from "@/components/layout/AuthForm";
export default function RegisterPage() {
  return (
    <PageWrapper>
      <Container className="max-w-sm">
        <h1 className="mb-6 text-2xl font-bold text-brand-700">
          Create account
        </h1>
        <AuthForm type="register" />
      </Container>
    </PageWrapper>
  );
}
