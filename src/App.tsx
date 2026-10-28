import { ApproachSection } from './components/ApproachSection';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { ContactSection } from './components/ContactSection';
import { DataProofSection } from './components/DataProofSection';
import { HeroSection } from './components/HeroSection';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';
import { SystemsSection } from './components/SystemsSection';

export default function App() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <CapabilitiesSection />
        <DataProofSection />
        <SystemsSection />
        <ApproachSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
