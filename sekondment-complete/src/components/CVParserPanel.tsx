'use client';

import { useState, useRef } from 'react';
import { extractFromCvFile } from '@/app/(app)/settings/cv-file-actions';
import { extractExpertiseFromText, enhanceProfileFromExtraction } from '@/app/(app)/settings/cv-ai-actions';
import type { Extraction } from '@/app/(app)/settings/cv-ai-actions';

/* CV upload + AI extraction panel for Expert onboarding / Settings.
   Works in two phases:
   1) Extract structured data from file or pasted text
   2) Apply selected fields to the profile (headline and bio)
   Returns are typed narrowly so you can branch on ok/true/false at call sites. */

export default function CVParserPanel({
  expertId,
  onApplied,
  compact = false,
}: {
  expertId: string;
  onApplied?: () => void;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [addedSkillCount, setAddedSkillCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const BATCH_SIZE = 10;
  const remainingSkills = extraction?.skills?.slice(addedSkillCount) ?? [];
  const currentBatch = remainingSkills.slice(0, BATCH_SIZE);
  const hasMoreSkills = remainingSkills.length > BATCH_SIZE;

  async function handleExtract() {
    setError(null);
    setExtracting(true);
    setExtraction(null);

    let res: { ok: true; extracted: Extraction; charCount: number } | { ok: false; error: string };

    if (mode === 'upload' && file) {
      const fd = new FormData();
      fd.append('cv', file);
      res = await extractFromCvFile(fd);
    } else if (mode === 'paste' && pasted.trim().length > 20) {
      res = await extractExpertiseFromText(pasted);
    } else {
      setExtracting(false);
      setError('Please upload a file or paste at least 20 characters.');
      return;
    }

    setExtracting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExtraction(res.extracted);
  }

  async function applyBatch() {
    if (!extraction || currentBatch.length === 0) return;
    setSaving(true);
    
    // Apply only current batch
    const batchExtraction = {
      ...extraction,
      skills: currentBatch,
    };
    
    const res = await enhanceProfileFromExtraction(expertId, batchExtraction);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to apply.');
      return;
    }
    
    // Mark these skills as added
    setAddedSkillCount(prev => prev + currentBatch.length);
    onApplied?.();
    
    // If no more skills, reset extraction
    if (addedSkillCount + currentBatch.length >= (extraction.skills?.length ?? 0)) {
      setExtraction(null);
      setAddedSkillCount(0);
      setFile(null);
      setPasted('');
    }
  }

  async function applyAll() {
    if (!extraction) return;
    setSaving(true);
    const res = await enhanceProfileFromExtraction(expertId, extraction);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to apply.');
      return;
    }
    onApplied?.();
    setExtraction(null);
    setAddedSkillCount(0);
    setFile(null);
    setPasted('');
  }

  if (compact && !extraction) {
    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg">Quick start with your CV</h3>
            <p className="text-sm text-muted">Upload or paste your CV and we'll pre-fill your profile</p>
          </div>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className="btn btn-primary text-sm"
          >
            Import CV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${compact ? 'mb-6' : 'mb-8'}`}>
      <h3 className="font-serif text-lg mb-2">Import from CV</h3>
      <p className="text-sm text-muted mb-4">
        We'll extract skills, headline, summary and suggested rate—then you choose what to apply.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-2 rounded-lg text-sm border ${
            mode === 'upload' ? 'bg-paper-2 border-[var(--line)]' : 'border-transparent'
          }`}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode('paste')}
          className={`px-3 py-2 rounded-lg text-sm border ${
            mode === 'paste' ? 'bg-paper-2 border-[var(--line)]' : 'border-transparent'
          }`}
        >
          Paste text
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[var(--line)] rounded-xl p-6 text-center hover:bg-paper-2 cursor-pointer transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,text/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="text-sm">
              <p className="font-medium">{file.name}</p>
              <p className="text-muted">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-sm text-muted">
              <p>Click to upload PDF, Word or text file</p>
              <p className="text-xs mt-1">Max 8MB</p>
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={6}
          placeholder="Paste CV text here..."
          className="field w-full"
        />
      )}

      {error && (
        <div className="mt-3 text-sm text-[#a14b3d] bg-[#a14b3d]/10 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!extraction && (
        <button
          type="button"
          onClick={handleExtract}
          disabled={extracting || (mode === 'upload' ? !file : pasted.length < 20)}
          className="btn btn-primary mt-4"
        >
          {extracting ? 'Reading…' : 'Extract from CV'}
        </button>
      )}

      {extraction && (
        <div className="mt-4 border border-[var(--line)] rounded-xl p-4">
          <h4 className="font-medium mb-3">Extracted</h4>

          {extraction.headline && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Headline</p>
              <p className="text-sm">{extraction.headline}</p>
            </div>
          )}

          {extraction.seniority && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Level</p>
              <span className="text-sm px-2 py-1 rounded-full bg-moss/10 text-moss">
                {extraction.seniority}
              </span>
            </div>
          )}

          {extraction.industries && extraction.industries.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Industries</p>
              <div className="flex flex-wrap gap-1">
                {extraction.industries.map((i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-paper-2">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentBatch.length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-muted mb-2">
                Skills ({addedSkillCount + 1}-{addedSkillCount + currentBatch.length} of {extraction.skills?.length})
              </p>
              <div className="flex flex-wrap gap-2 leading-relaxed">
                {currentBatch.map((s) => (
                  <span key={s} className="text-xs px-2 py-1.5 rounded-full bg-moss/10 text-moss mb-1">
                    {s}
                  </span>
                ))}
              </div>
              {hasMoreSkills && (
                <p className="text-xs text-muted mt-2">
                  +{remainingSkills.length - BATCH_SIZE} more skills after adding these
                </p>
              )}
            </div>
          )}

          {extraction.achievements && extraction.achievements.length > 0 && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Key achievements</p>
              <ul className="text-sm list-disc pl-4 space-y-1">
                {extraction.achievements.slice(0, 5).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {extraction.suggested_rate && (
            <div className="mb-4 p-3 rounded-lg bg-gold/10 border border-gold/30">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Suggested rate</p>
              <p className="font-medium">
                {extraction.suggested_rate.currency}{extraction.suggested_rate.min} - {extraction.suggested_rate.currency}{extraction.suggested_rate.max}
              </p>
              <p className="text-xs text-muted">Based on CV analysis</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={applyBatch}
              disabled={saving || currentBatch.length === 0}
              className="btn btn-primary"
            >
              {saving ? 'Adding…' : `Add ${currentBatch.length} skills to profile`}
            </button>
            {hasMoreSkills && (
              <button
                type="button"
                onClick={applyAll}
                disabled={saving}
                className="btn btn-secondary"
              >
                Add all {extraction.skills?.length} skills
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setExtraction(null);
                setAddedSkillCount(0);
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
