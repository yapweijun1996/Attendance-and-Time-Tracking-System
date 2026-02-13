import { useCallback, useEffect, useState } from "react";

import { savePolicyConfig, loadPolicyConfig } from "../../services/policy-config";
import type { PolicyConfig } from "../../types/policy";
import { resetPolicyCache } from "../../mobile/services/policy";

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export default function SettingsPage() {
  const [threshold, setThreshold] = useState("0.60");
  const [cooldownSec, setCooldownSec] = useState("300");
  const [maxWidth, setMaxWidth] = useState("640");
  const [jpegQuality, setJpegQuality] = useState("0.80");
  const [maxPerEvent, setMaxPerEvent] = useState("1");
  const [localDays, setLocalDays] = useState("30");
  const [serverDays, setServerDays] = useState("90");
  const [currentPolicy, setCurrentPolicy] = useState<PolicyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hydrateForm = useCallback((policy: PolicyConfig) => {
    setThreshold(policy.verification.threshold.toFixed(2));
    setCooldownSec(String(policy.cooldown.cooldownSec));
    setMaxWidth(String(policy.evidence.maxWidth));
    setJpegQuality(policy.evidence.jpegQuality.toFixed(2));
    setMaxPerEvent(String(policy.evidence.maxPerEvent));
    setLocalDays(String(policy.retention.localDays));
    setServerDays(String(policy.retention.serverDays));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const policy = await loadPolicyConfig();
        if (cancelled) {
          return;
        }
        setCurrentPolicy(policy);
        hydrateForm(policy);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load policy config.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [hydrateForm]);

  const handleSave = useCallback(async () => {
    if (!currentPolicy) {
      return;
    }

    const nextThreshold = Number(threshold);
    const nextCooldownSec = Number(cooldownSec);
    const nextMaxWidth = Number(maxWidth);
    const nextJpegQuality = Number(jpegQuality);
    const nextMaxPerEvent = Number(maxPerEvent);
    const nextLocalDays = Number(localDays);
    const nextServerDays = Number(serverDays);

    if (!isFiniteNumber(nextThreshold) || nextThreshold <= 0 || nextThreshold > 1) {
      setErrorMessage("Verification threshold must be between 0 and 1.");
      setSuccessMessage(null);
      return;
    }
    if (!Number.isInteger(nextCooldownSec) || nextCooldownSec <= 0) {
      setErrorMessage("Cooldown must be a positive integer.");
      setSuccessMessage(null);
      return;
    }
    if (!Number.isInteger(nextMaxWidth) || nextMaxWidth < 240) {
      setErrorMessage("Evidence max width must be an integer >= 240.");
      setSuccessMessage(null);
      return;
    }
    if (!isFiniteNumber(nextJpegQuality) || nextJpegQuality <= 0 || nextJpegQuality > 1) {
      setErrorMessage("JPEG quality must be between 0 and 1.");
      setSuccessMessage(null);
      return;
    }
    if (!Number.isInteger(nextMaxPerEvent) || nextMaxPerEvent <= 0) {
      setErrorMessage("Max evidence per event must be a positive integer.");
      setSuccessMessage(null);
      return;
    }
    if (!Number.isInteger(nextLocalDays) || nextLocalDays <= 0) {
      setErrorMessage("Local retention days must be a positive integer.");
      setSuccessMessage(null);
      return;
    }
    if (!Number.isInteger(nextServerDays) || nextServerDays <= 0) {
      setErrorMessage("Server retention days must be a positive integer.");
      setSuccessMessage(null);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const saved = await savePolicyConfig({
        ...currentPolicy,
        verification: {
          threshold: nextThreshold,
        },
        cooldown: {
          cooldownSec: nextCooldownSec,
        },
        evidence: {
          maxWidth: nextMaxWidth,
          jpegQuality: nextJpegQuality,
          maxPerEvent: nextMaxPerEvent,
        },
        retention: {
          localDays: nextLocalDays,
          serverDays: nextServerDays,
        },
      });

      setCurrentPolicy(saved);
      hydrateForm(saved);
      resetPolicyCache();
      setSuccessMessage("Policy saved to local database.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save policy.");
      setSuccessMessage(null);
    } finally {
      setSaving(false);
    }
  }, [
    cooldownSec,
    currentPolicy,
    hydrateForm,
    jpegQuality,
    localDays,
    maxPerEvent,
    maxWidth,
    serverDays,
    threshold,
  ]);

  return (
    <div className="space-y-4">
      <section className="ui-card p-4">
        <h2 className="ui-title text-sm">Policy Settings</h2>
        <p className="ui-text mt-1 text-sm">
          Save policy to local DB. Verify flow reads the threshold from POLICY_CONFIG.
        </p>
        {loading ? <p className="ui-note mt-2">Loading policy...</p> : null}
        {errorMessage ? <p className="ui-note-error mt-2">{errorMessage}</p> : null}
        {successMessage ? <p className="ui-note mt-2 text-emerald-700">{successMessage}</p> : null}
      </section>

      <section className="ui-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Verification Threshold
            <input value={threshold} onChange={(event) => setThreshold(event.target.value)} className="ui-input" />
          </label>
          <label className="text-sm text-slate-700">
            Cooldown (sec)
            <input value={cooldownSec} onChange={(event) => setCooldownSec(event.target.value)} className="ui-input" />
          </label>
          <label className="text-sm text-slate-700">
            Evidence Max Width
            <input value={maxWidth} onChange={(event) => setMaxWidth(event.target.value)} className="ui-input" />
          </label>
          <label className="text-sm text-slate-700">
            JPEG Quality
            <input value={jpegQuality} onChange={(event) => setJpegQuality(event.target.value)} className="ui-input" />
          </label>
          <label className="text-sm text-slate-700">
            Max Evidence Per Event
            <input value={maxPerEvent} onChange={(event) => setMaxPerEvent(event.target.value)} className="ui-input" />
          </label>
          <label className="text-sm text-slate-700">
            Local Retention Days
            <input value={localDays} onChange={(event) => setLocalDays(event.target.value)} className="ui-input" />
          </label>
          <label className="text-sm text-slate-700">
            Server Retention Days
            <input value={serverDays} onChange={(event) => setServerDays(event.target.value)} className="ui-input" />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={loading || saving || !currentPolicy}
          className="ui-btn ui-btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Policy"}
        </button>
      </section>
    </div>
  );
}
