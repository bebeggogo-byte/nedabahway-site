import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<main className="page page--narrow"><p>로딩...</p></main>}>
        <SignupForm />
      </Suspense>
      <Footer />
    </>
  );
}
