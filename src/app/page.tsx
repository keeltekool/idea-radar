import { Header } from "./components/header";
import { Footer } from "./components/footer";
import { DashboardContent } from "./components/dashboard-content";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-10 py-10 w-full">
        <DashboardContent />
      </main>
      <Footer />
    </>
  );
}
