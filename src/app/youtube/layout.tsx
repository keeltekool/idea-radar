import { Header } from "../components/header";
import { Footer } from "../components/footer";

export default function YouTubeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-[1280px] mx-auto px-5 md:px-10 py-8 md:py-10 w-full">
        {children}
      </main>
      <Footer />
    </>
  );
}
