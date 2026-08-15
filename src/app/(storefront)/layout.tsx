import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FloatingActions from "@/components/layout/FloatingActions";
import { CartProvider } from "@/components/carrito/CartProvider";
import CartDrawer from "@/components/carrito/CartDrawer";
import PopupBanner from "@/components/home/PopupBanner";
import { getBanners } from "@/lib/queries";
import { getSiteConfig } from "@/lib/site-config";

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
  const [popupBanners, siteConfig] = await Promise.all([
    getBanners("popup"),
    getSiteConfig(),
  ]);
  const {
    whatsapp,
    descuento_tramos: tramos,
    envio_gratis_desde: envioGratisDesde,
  } = siteConfig;

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Sendero Shop",
    alternateName: "Sendero de los Sueños",
    url: "https://sendero3d.com",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `https://wa.me/${whatsapp}`,
      availableLanguage: "Spanish",
    },
  };

  return (
    <CartProvider tramos={tramos} envioGratisDesde={envioGratisDesde}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer whatsapp={whatsapp} />
      <FloatingActions whatsapp={whatsapp} />
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
