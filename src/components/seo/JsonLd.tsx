// Schema.org markup for search engines (server/seo.ts builds it). "<" is escaped so text from the
// content can't close the script tag.
export default function JsonLd({ data }: { data: object | null | (object | null)[] }) {
  const items = (Array.isArray(data) ? data : [data]).filter((item): item is object => item !== null);
  if (!items.length) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(items.length === 1 ? items[0] : items).replace(/</g, "\\u003c") }}
    />
  );
}
