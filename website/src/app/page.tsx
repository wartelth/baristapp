import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Skills from "@/components/Skills";
import Security from "@/components/Security";
import Architecture from "@/components/Architecture";
import GetStarted from "@/components/GetStarted";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Skills />
      <Security />
      <Architecture />
      <GetStarted />
      <Footer />
    </main>
  );
}
