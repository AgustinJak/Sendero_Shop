export const metadata = {
  title: { default: "Admin — Sendero Shop", template: "%s | Admin — Sendero Shop" },
  robots: "noindex, nofollow",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
