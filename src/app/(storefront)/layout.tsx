import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WhatsAppButton from "@/components/layout/WhatsAppButton";
import { CartProvider } from "@/components/carrito/CartProvider";
import CartDrawer from "@/components/carrito/CartDrawer";
import PopupBanner from "@/components/home/PopupBanner";
import { getBanners } from "@/lib/queries";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sendero Shop",
  alternateName: "Sendero de los Sueños",
  url: "https://sendero3d.com",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    url: "https://wa.me/5491125502785",
    availableLanguage: "Spanish",
  },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sendero Shop",
  url: "https://sendero3d.com",
};

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const popupBanners = await getBanners("popup");

  return (
    <CartProvider>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
      {popupBanners.length > 0 && <PopupBanner banner={popupBanners[0]} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
    </CartProvider>
  );
}
