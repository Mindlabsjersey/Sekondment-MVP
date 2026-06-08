import { createClient } from '@/lib/supabase/server';
import PublicHeader from '../browse/PublicHeader';

export default async function TermsPage() {
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from('legal_documents')
    .select('id, kind, title, version, body, effective_at')
    .eq('is_current', true)
    .eq('jurisdiction', 'global')
    .order('kind');

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl tracking-tight mb-2">Legal & terms</h1>
        <p className="text-muted mb-10">
          Sekondment facilitates engagements between businesses and experts. It is not the
          employer of experts and does not own the work. Current documents are below.
        </p>

        <div className="space-y-10">
          {(docs ?? []).map((d) => (
            <section key={d.id} id={d.kind}>
              <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                <h2 className="font-serif text-2xl">{d.title}</h2>
                <span className="text-xs text-muted">v{d.version}</span>
              </div>
              <p className="text-ink/80 leading-relaxed whitespace-pre-line">{d.body}</p>
            </section>
          ))}
          {(!docs || docs.length === 0) && (
            <p className="text-muted">Terms are being prepared.</p>
          )}
        </div>
      </main>
    </div>
  );
}
