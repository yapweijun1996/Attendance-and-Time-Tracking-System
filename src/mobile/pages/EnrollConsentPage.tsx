import { ENROLLMENT_CONSENT_VERSION } from "../services/enrollment";
import { saveEnrollmentDraft } from "../services/enrollment-draft";

interface EnrollConsentPageProps {
  onBack: () => void;
  onAccepted: (acceptedAt: string) => void;
}

export default function EnrollConsentPage({ onBack, onAccepted }: EnrollConsentPageProps) {
  return (
    <div className="ui-page-flow">
      <main className="ui-main-flow">
        <button type="button" onClick={onBack} className="ui-back-btn">
          Back
        </button>

        <h1 className="ui-title text-xl">Enrollment Consent</h1>
        <p className="ui-note mt-1">
          Read and accept before camera capture starts.
        </p>

        <section className="ui-card mt-4 p-4">
          <p className="ui-kicker">
            Consent Version
          </p>
          <p className="ui-title mt-1 text-sm">{ENROLLMENT_CONSENT_VERSION}</p>

          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>1. Device camera will be used for enrollment and attendance verification.</li>
            <li>2. The profile stores face descriptors and enrollment snapshots for audit traceability.</li>
            <li>3. You can request admin reset when profile changes are needed.</li>
          </ul>
        </section>

        <button
          type="button"
          onClick={() => {
            const acceptedAt = new Date().toISOString();
            saveEnrollmentDraft({
              consentAcceptedAt: acceptedAt,
              descriptors: [],
              photos: [],
            });
            onAccepted(acceptedAt);
          }}
          className="ui-btn ui-btn-primary mt-4 w-full"
        >
          I Agree, Continue
        </button>
      </main>
    </div>
  );
}
