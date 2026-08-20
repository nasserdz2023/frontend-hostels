import { getLocale } from "next-intl/server";

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  
  return (
    <div className="container mx-auto py-6 px-4">
      {children}
    </div>
  );
}