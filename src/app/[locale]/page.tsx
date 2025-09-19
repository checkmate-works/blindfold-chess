import { PageTitle } from './_components/PageTitle';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <>
      <PageTitle>Now implementing...</PageTitle>
      <p className="text-muted-foreground">locale: {locale}</p>
    </>
  );
}
