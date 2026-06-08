import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

/* ============================================================================
   On a completed (paid) engagement, upgrade the expert's expertise that was
   required by the opportunity from 'declared' -> 'proven', and attach
   completed_engagement evidence. This is how proof accrues from real work —
   the mechanism that makes "proven expertise" meaningful over time.
   ========================================================================== */

export async function upgradeExpertiseOnCompletion(engagementId: string): Promise<void> {
  try {
    const svc = createServiceClient();

    // Resolve the engagement -> expert profile + originating opportunity.
    const { data: eng } = await svc
      .from('engagements')
      .select('id, expert_id, opportunity_id')
      .eq('id', engagementId).single();
    if (!eng?.expert_id || !eng.opportunity_id) return;

    // Which expertise did the opportunity require?
    const { data: reqs } = await svc
      .from('project_expertise_requirements')
      .select('expertise_id')
      .eq('opportunity_id', eng.opportunity_id);
    if (!reqs || reqs.length === 0) return;

    for (const r of reqs) {
      // Does the expert already hold this expertise?
      const { data: pe } = await svc
        .from('profile_expertise')
        .select('id, verification_level, project_count')
        .eq('profile_id', eng.expert_id).eq('profile_type', 'expert')
        .eq('expertise_id', r.expertise_id).maybeSingle();

      if (pe) {
        // Upgrade to proven + increment project count.
        await svc.from('profile_expertise').update({
          verification_level: 'proven',
          project_count: (pe.project_count ?? 0) + 1,
          last_used_at: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        }).eq('id', pe.id);

        // Attach completed-engagement evidence.
        await svc.from('expertise_evidence').insert({
          profile_expertise_id: pe.id,
          evidence_type: 'completed_engagement',
          reference_id: engagementId,
          description: 'Completed and paid engagement on Sekondment',
          verified: true,
        });
      } else {
        // Expert delivered expertise they hadn't declared — record it as proven.
        const { data: created } = await svc.from('profile_expertise').insert({
          profile_id: eng.expert_id, profile_type: 'expert', expertise_id: r.expertise_id,
          declared_level: 3, verification_level: 'proven', project_count: 1,
          last_used_at: new Date().toISOString().slice(0, 10),
        }).select('id').single();
        if (created) {
          await svc.from('expertise_evidence').insert({
            profile_expertise_id: created.id, evidence_type: 'completed_engagement',
            reference_id: engagementId, description: 'Completed and paid engagement on Sekondment', verified: true,
          });
        }
      }
    }
  } catch (e) {
    console.error('[expertise upgrade]', (e as Error).message);
  }
}
