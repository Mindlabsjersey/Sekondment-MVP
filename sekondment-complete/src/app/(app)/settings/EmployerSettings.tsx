'use client';

import { useState } from 'react';
import { saveEmployerSettings } from './actions';

interface EmployerSettingsProps {
  profile: {
    id: string;
    default_approval_required?: boolean;
    default_revenue_share_employer_pct?: number;
    default_revenue_share_employee_pct?: number;
    max_hours_per_week?: number;
    allow_external_projects?: boolean;
  };
}

export default function EmployerSettings({ profile }: EmployerSettingsProps) {
  const [approvalRequired, setApprovalRequired] = useState(profile.default_approval_required ?? true);
  const [employerShare, setEmployerShare] = useState(profile.default_revenue_share_employer_pct ?? 80);
  const [employeeShare, setEmployeeShare] = useState(profile.default_revenue_share_employee_pct ?? 20);
  const [maxHours, setMaxHours] = useState(profile.max_hours_per_week ?? 10);
  const [allowExternal, setAllowExternal] = useState(profile.allow_external_projects ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await saveEmployerSettings({
      default_approval_required: approvalRequired,
      default_revenue_share_employer_pct: employerShare,
      default_revenue_share_employee_pct: employeeShare,
      max_hours_per_week: maxHours,
      allow_external_projects: allowExternal,
    });
    setSaving(false);
    if (!res.error) setSaved(true);
  }

  return (
    <div className="card mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sand/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-sand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h3 className="font-medium">Employee Management</h3>
          <p className="text-sm text-muted">Control how employees engage with Sekondment opportunities</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Approval Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-ink/80 uppercase tracking-wide">Approval</h4>
          
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={approvalRequired}
              onChange={(e) => setApprovalRequired(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[var(--line)] text-moss focus:ring-moss"
            />
            <div>
              <p className="text-sm font-medium">Require approval for all opportunities</p>
              <p className="text-xs text-muted">Employees must get your approval before accepting any project</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowExternal}
              onChange={(e) => setAllowExternal(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[var(--line)] text-moss focus:ring-moss"
            />
            <div>
              <p className="text-sm font-medium">Allow external projects</p>
              <p className="text-xs text-muted">Employees can work with businesses other than yours</p>
            </div>
          </label>
        </div>

        {/* Revenue Share */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-ink/80 uppercase tracking-wide">Revenue Share</h4>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted">Employer share</span>
              <span className="font-medium">{employerShare}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={employerShare}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setEmployerShare(val);
                setEmployeeShare(100 - val);
              }}
              className="w-full h-2 bg-paper-2 rounded-lg appearance-none cursor-pointer accent-moss"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>50%</span>
              <span>95%</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-paper-2">
            <span className="text-sm text-muted">Employee bonus</span>
            <span className="font-semibold text-moss">{employeeShare}%</span>
          </div>
        </div>

        {/* Hours Restrictions */}
        <div className="space-y-4 md:col-span-2">
          <h4 className="text-sm font-semibold text-ink/80 uppercase tracking-wide">Availability Limits</h4>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Maximum hours per week</label>
              <select
                value={maxHours}
                onChange={(e) => setMaxHours(parseInt(e.target.value))}
                className="field w-full"
              >
                <option value={5}>5 hours</option>
                <option value={10}>10 hours</option>
                <option value={15}>15 hours</option>
                <option value={20}>20 hours</option>
                <option value={40}>40 hours (full time)</option>
              </select>
              <p className="text-xs text-muted mt-1">Cap on additional work hours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--line)]">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-moss">Settings saved</span>}
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 rounded-xl bg-moss/5 border border-moss/20">
        <h4 className="text-sm font-medium text-moss mb-1">How revenue sharing works</h4>
        <p className="text-sm text-muted">
          When your employee completes a £5,000 project: Sekondment takes 8% platform fee (£400), 
          then {employerShare}% goes to your business (£{(4600 * employerShare / 100).toFixed(0)}), 
          and {employeeShare}% goes to your employee as a bonus (£{(4600 * employeeShare / 100).toFixed(0)}).
        </p>
      </div>
    </div>
  );
}
