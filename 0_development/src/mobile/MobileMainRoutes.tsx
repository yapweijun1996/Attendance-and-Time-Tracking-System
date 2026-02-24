import type { ReactNode } from "react";

import DesktopSidebar from "./components/DesktopSidebar";
import EnrollCapturePage from "./pages/EnrollCapturePage";
import EnrollConsentPage from "./pages/EnrollConsentPage";
import EnrollLivenessPage from "./pages/EnrollLivenessPage";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ResultPage from "./pages/ResultPage";
import VerifyPage from "./pages/VerifyPage";
import type { MobileRoute } from "./router";
import type { AttendanceAction, EnrollStatus, RecentEvent, SyncState, VerificationResult } from "./types";

interface MobileMainRoutesProps {
  currentRoute: MobileRoute;
  dbReady: boolean;
  enrollStatus: EnrollStatus;
  descriptorCount: number;
  staffBound: boolean;
  staffId: string | null;
  staffName: string | null;
  online: boolean;
  latestSyncState: SyncState;
  recentEvents: RecentEvent[];
  lastResult: VerificationResult | null;
  verifyAction: AttendanceAction;
  enrollConsentAcceptedAt: string | null;
  enrollDescriptors: number[][];
  enrollPhotos: string[];
  onAction: (action: AttendanceAction) => void;
  onStartEnrollment: () => void;
  onNavigate: (route: MobileRoute) => void;
  onNavigatePath: (path: string) => void;
  onBindStaff: (staffId: string) => void;
  onClearStaffBinding: () => void;
  onLogout: () => void;
  onVerifyCompleted: (result: VerificationResult) => void;
  onConsentAccepted: (acceptedAt: string) => void;
  onCaptureCompleted: (payload: { descriptors: number[][]; photos: string[] }) => void;
  onCaptureReset: () => void;
  onEnrollmentSaved: (message: string) => void;
}

function EnrollmentDesktopShell({
  staffName,
  onNavigate,
  fullBleed = false,
  children,
}: {
  staffName: string | null;
  onNavigate: (route: MobileRoute) => void;
  fullBleed?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullBleed ? "min-h-screen bg-black font-sans" : "min-h-screen bg-slate-50/30 font-sans"}>
      <DesktopSidebar currentRoute="/m/profile" staffName={staffName} onNavigate={onNavigate} />
      <div
        className={
          fullBleed
            ? "w-full lg:pl-72"
            : "mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 lg:pl-72 lg:py-8"
        }
      >
        {children}
      </div>
    </div>
  );
}

export default function MobileMainRoutes({
  currentRoute,
  dbReady,
  enrollStatus,
  descriptorCount,
  staffBound,
  staffId,
  staffName,
  online,
  latestSyncState,
  recentEvents,
  lastResult,
  verifyAction,
  enrollConsentAcceptedAt,
  enrollDescriptors,
  enrollPhotos,
  onAction,
  onStartEnrollment,
  onNavigate,
  onNavigatePath,
  onBindStaff,
  onClearStaffBinding,
  onLogout,
  onVerifyCompleted,
  onConsentAccepted,
  onCaptureCompleted,
  onCaptureReset,
  onEnrollmentSaved,
}: MobileMainRoutesProps) {
  if (currentRoute === "/m/enroll/consent") {
    return (
      <EnrollmentDesktopShell staffName={staffName} onNavigate={onNavigate}>
        <EnrollConsentPage onBack={() => onNavigate("/m/home")} onAccepted={onConsentAccepted} />
      </EnrollmentDesktopShell>
    );
  }
  if (currentRoute === "/m/enroll/capture") {
    return (
      <EnrollmentDesktopShell staffName={staffName} onNavigate={onNavigate} fullBleed>
        <EnrollCapturePage
          consentAcceptedAt={enrollConsentAcceptedAt}
          initialDescriptors={enrollDescriptors}
          initialPhotos={enrollPhotos}
          onBack={() => onNavigate("/m/enroll/consent")}
          onReset={onCaptureReset}
          onCompleted={onCaptureCompleted}
        />
      </EnrollmentDesktopShell>
    );
  }
  if (currentRoute === "/m/enroll/liveness") {
    return (
      <EnrollmentDesktopShell staffName={staffName} onNavigate={onNavigate}>
        <EnrollLivenessPage
          consentAcceptedAt={enrollConsentAcceptedAt}
          descriptors={enrollDescriptors}
          photos={enrollPhotos}
          onBack={() => onNavigate("/m/enroll/capture")}
          onRestart={onStartEnrollment}
          onSaved={onEnrollmentSaved}
        />
      </EnrollmentDesktopShell>
    );
  }
  if (currentRoute === "/m/verify") {
    return (
      <VerifyPage
        currentRoute={currentRoute}
        action={verifyAction}
        staffName={staffName}
        dbReady={dbReady}
        online={online}
        latestSyncState={latestSyncState}
        onBack={() => onNavigate("/m/home")}
        onNavigate={onNavigate}
        onCompleted={onVerifyCompleted}
      />
    );
  }
  if (currentRoute === "/m/result") {
    return (
      <ResultPage
        currentRoute={currentRoute}
        result={lastResult}
        onNavigatePath={onNavigatePath}
        onNavigate={onNavigate}
      />
    );
  }
  if (currentRoute === "/m/history") {
    return (
      <HistoryPage
        currentRoute={currentRoute}
        staffName={staffName}
        events={recentEvents}
        onNavigate={onNavigate}
      />
    );
  }
  if (currentRoute === "/m/profile") {
    return (
      <ProfilePage
        currentRoute={currentRoute}
        dbReady={dbReady}
        enrollStatus={enrollStatus}
        descriptorCount={descriptorCount}
        staffBound={staffBound}
        staffId={staffId}
        staffName={staffName}
        online={online}
        onStartEnrollment={onStartEnrollment}
        onBindStaff={onBindStaff}
        onClearStaffBinding={onClearStaffBinding}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
    );
  }
  return (
    <HomePage
      currentRoute={currentRoute}
      dbReady={dbReady}
      enrollStatus={enrollStatus}
      staffBound={staffBound}
      staffName={staffName}
      online={online}
      latestSyncState={latestSyncState}
      recentEvents={recentEvents}
      onAction={onAction}
      onStartEnrollment={onStartEnrollment}
      onNavigate={onNavigate}
    />
  );
}
