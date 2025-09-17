export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Now implementing...</h1>
      <p className="text-muted-foreground">locale: {locale}</p>
    </div>
  );
}
