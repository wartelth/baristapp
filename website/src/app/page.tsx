import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import WhatItDoes from "@/components/WhatItDoes";
import HowItWorks from "@/components/HowItWorks";
import AppShowcase from "@/components/AppShowcase";
import GetStarted from "@/components/GetStarted";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <WhatItDoes />
      <HowItWorks />
      <AppShowcase />
      <GetStarted />
      <Footer />
    </main>
  );
}
