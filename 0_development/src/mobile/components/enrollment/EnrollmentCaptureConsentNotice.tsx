interface EnrollmentCaptureConsentNoticeProps {
  onBack: () => void;
}

export default function EnrollmentCaptureConsentNotice({ onBack }: EnrollmentCaptureConsentNoticeProps) {
  return (
    <div className="ui-page-flow">
      <main className="ui-main-flow">
        <h1 className="ui-title text-xl">Enrollment Capture</h1>
        <p className="ui-note-warn mt-2">Consent is required before capture. Returning to consent step.</p>
        <button type="button" onClick={onBack} className="ui-btn ui-btn-primary mt-4 w-full">
          Back To Consent
        </button>
      </main>
    </div>
  );
}
