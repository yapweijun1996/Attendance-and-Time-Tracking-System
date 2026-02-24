import { useCallback, useEffect, useMemo, useState } from "react";

import { useStaffAccess } from "./hooks/useStaffAccess";
import MobileMainRoutes from "./MobileMainRoutes";
import StaffForcePasswordPage from "./pages/StaffForcePasswordPage";
import { DEFAULT_MOBILE_ROUTE, navigateTo, readMobileRoute, type MobileRoute, type MobileRouteState } from "./router";
import { loadRecentEvents } from "./services/attendance-log";
import { clearEnrollmentDraft } from "./services/enrollment-draft";
import { loadEnrollmentSummary } from "./services/enrollment";
import { readLocationState } from "../shared/navigation";
import type { AttendanceAction, EnrollStatus, RecentEvent, SyncState, VerificationResult } from "./types";

function parseVerifyAction(search: string): AttendanceAction {
  const params = new URLSearchParams(search);
  return params.get("action") === "OUT" ? "OUT" : "IN";
}

export default function MobileApp() {
  const [routeState, setRouteState] = useState<MobileRouteState>(() => readMobileRoute());
  const [dbReady, setDbReady] = useState(false);
  const [enrollStatus, setEnrollStatus] = useState<EnrollStatus>("PENDING_CONSENT");
  const [descriptorCount, setDescriptorCount] = useState(0);
  const [staffBound, setStaffBound] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [latestSyncState, setLatestSyncState] = useState<SyncState>("SYNCED");
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);
  const [enrollConsentAcceptedAt, setEnrollConsentAcceptedAt] = useState<string | null>(null);
  const [enrollDescriptors, setEnrollDescriptors] = useState<number[][]>([]);
  const [enrollPhotos, setEnrollPhotos] = useState<string[]>([]);
  const [appError, setAppError] = useState<string | null>(null);
  const [appNotice, setAppNotice] = useState<string | null>(null);

  const refreshRecentEvents = useCallback(async () => {
    try {
      const events = await loadRecentEvents(30);
      setRecentEvents(events);
      if (events.length > 0) {
        setLatestSyncState(events[0].syncState);
      }
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Failed to load recent events.");
    }
  }, []);

  const refreshEnrollment = useCallback(async () => {
    try {
      const summary = await loadEnrollmentSummary();
      setEnrollStatus(summary.status);
      setDescriptorCount(summary.descriptorCount);
      setStaffBound(summary.staffBound);
      setStaffId(summary.staffId);
      setStaffName(summary.staffName);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Failed to load enrollment status.");
    }
  }, []);

  const {
    staffSession,
    refreshSessionState,
    handleStaffPasswordChange,
    handleStaffLogout,
    handleBindStaff,
    handleClearStaffBinding,
  } = useStaffAccess({
    refreshEnrollment,
    refreshRecentEvents,
    setAppError,
    setAppNotice,
    setStaffBound,
    setStaffId,
    setStaffName,
    setEnrollStatus,
    setDescriptorCount,
    setLastResult,
  });

  useEffect(() => {
    const onPopState = () => setRouteState(readMobileRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (readLocationState().pathname !== routeState.route) {
      navigateTo(routeState.route, true);
    }
  }, [routeState.route]);

  useEffect(() => {
    let cancelled = false;
    const initDb = async () => {
      try {
        const { pouchDBService } = await import("../services/db");
        if (cancelled) {
          return;
        }
        pouchDBService.init();
        setDbReady(true);
        await refreshSessionState();
        await Promise.all([refreshRecentEvents(), refreshEnrollment()]);
      } catch (error) {
        if (!cancelled) {
          setAppError(error instanceof Error ? error.message : "Failed to initialize local database.");
        }
      }
    };
    void initDb();
    return () => {
      cancelled = true;
    };
  }, [refreshEnrollment, refreshRecentEvents, refreshSessionState]);

  useEffect(() => {
    if (!dbReady) {
      return;
    }
    if (routeState.route === "/m/home" || routeState.route === "/m/history") {
      void refreshRecentEvents();
    }
    if (routeState.route === "/m/home" || routeState.route === "/m/profile") {
      void refreshEnrollment();
      void refreshSessionState();
    }
  }, [dbReady, refreshEnrollment, refreshRecentEvents, refreshSessionState, routeState.route]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!dbReady) {
      return;
    }
    const route = routeState.route;
    if (!staffSession) {
      navigateTo("/login?role=staff", true);
      return;
    }
    if (staffSession?.mustChangePassword && route !== "/m/change-password") {
      navigateTo("/m/change-password", true);
      return;
    }
    if (staffSession && !staffSession.mustChangePassword && (route === "/m/login" || route === "/m/change-password")) {
      navigateTo("/m/home", true);
    }
  }, [dbReady, routeState.route, staffSession]);

  const verifyAction = useMemo(() => parseVerifyAction(routeState.search), [routeState.search]);
  const handleNavigate = useCallback((route: MobileRoute) => navigateTo(route), []);
  const handleNavigatePath = useCallback((path: string) => navigateTo(path), []);

  const handleStartEnrollment = useCallback(() => {
    if (!staffBound) {
      setAppError("No staff is bound to this session. Please contact admin.");
      navigateTo("/m/profile");
      return;
    }
    setAppNotice(null);
    setEnrollConsentAcceptedAt(null);
    setEnrollDescriptors([]);
    setEnrollPhotos([]);
    clearEnrollmentDraft();
    navigateTo("/m/enroll/consent");
  }, [staffBound]);

  useEffect(() => {
    if (routeState.route === "/m/verify" && enrollStatus !== "ACTIVE") {
      handleStartEnrollment();
    }
  }, [enrollStatus, handleStartEnrollment, routeState.route]);

  const handleConsentAccepted = useCallback((acceptedAt: string) => {
    setEnrollConsentAcceptedAt(acceptedAt);
    setEnrollDescriptors([]);
    setEnrollPhotos([]);
    navigateTo("/m/enroll/capture");
  }, []);

  const handleCaptureCompleted = useCallback((payload: { descriptors: number[][]; photos: string[] }) => {
    setEnrollDescriptors(payload.descriptors);
    setEnrollPhotos(payload.photos);
    navigateTo("/m/enroll/liveness");
  }, []);

  const handleEnrollmentSaved = useCallback(
    (message: string) => {
      const finalize = async () => {
        await refreshEnrollment();
        setEnrollConsentAcceptedAt(null);
        setEnrollDescriptors([]);
        setEnrollPhotos([]);
        clearEnrollmentDraft();
        setAppError(null);
        setAppNotice(message);
        navigateTo("/m/home");
      };
      void finalize();
    },
    [refreshEnrollment]
  );

  const handleAction = useCallback(
    (action: AttendanceAction) => {
      if (enrollStatus !== "ACTIVE") {
        handleStartEnrollment();
        return;
      }
      navigateTo(`/m/verify?action=${action}`);
    },
    [enrollStatus, handleStartEnrollment]
  );

  const handleVerifyCompleted = useCallback(
    (result: VerificationResult) => {
      setLastResult(result);
      setLatestSyncState(result.syncState);
      setAppNotice(null);
      void refreshRecentEvents();
      navigateTo("/m/result");
    },
    [refreshRecentEvents]
  );

  const currentRoute = routeState.route ?? DEFAULT_MOBILE_ROUTE;
  const sidebarBannerOffset = ["/m/home", "/m/history", "/m/profile", "/m/verify", "/m/enroll/consent", "/m/enroll/capture", "/m/enroll/liveness"].includes(currentRoute);
  const bannerMessage = appError ?? appNotice;
  const banner = bannerMessage ? (
    <div className={sidebarBannerOffset ? "px-4 pt-4 sm:px-8 lg:pr-8 lg:pl-72" : "px-4 pt-4 sm:px-8"}>
      <div className={appError ? "ui-banner-error" : "ui-banner-success"}>{bannerMessage}</div>
    </div>
  ) : null;

  if (currentRoute === "/m/login") {
    navigateTo("/login?role=staff", true);
    return <>{banner}</>;
  }

  if (currentRoute === "/m/change-password") {
    return (
      <>
        {banner}
        <StaffForcePasswordPage
          staffId={staffSession?.staffId ?? ""}
          onSubmit={handleStaffPasswordChange}
          onLogout={handleStaffLogout}
        />
      </>
    );
  }

  return (
    <>
      {banner}
      <MobileMainRoutes
        currentRoute={currentRoute}
        dbReady={dbReady}
        enrollStatus={enrollStatus}
        descriptorCount={descriptorCount}
        staffBound={staffBound}
        staffId={staffId}
        staffName={staffName}
        online={online}
        latestSyncState={latestSyncState}
        recentEvents={recentEvents}
        lastResult={lastResult}
        verifyAction={verifyAction}
        enrollConsentAcceptedAt={enrollConsentAcceptedAt}
        enrollDescriptors={enrollDescriptors}
        enrollPhotos={enrollPhotos}
        onAction={handleAction}
        onStartEnrollment={handleStartEnrollment}
        onNavigate={handleNavigate}
        onNavigatePath={handleNavigatePath}
        onBindStaff={handleBindStaff}
        onClearStaffBinding={handleClearStaffBinding}
        onLogout={handleStaffLogout}
        onVerifyCompleted={handleVerifyCompleted}
        onConsentAccepted={handleConsentAccepted}
        onCaptureCompleted={handleCaptureCompleted}
        onCaptureReset={() => {
          setEnrollDescriptors([]);
          setEnrollPhotos([]);
        }}
        onEnrollmentSaved={handleEnrollmentSaved}
      />
    </>
  );
}
