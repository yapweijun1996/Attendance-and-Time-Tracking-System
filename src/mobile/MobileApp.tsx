import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import EnrollCapturePage from "./pages/EnrollCapturePage";
import EnrollConsentPage from "./pages/EnrollConsentPage";
import EnrollLivenessPage from "./pages/EnrollLivenessPage";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ResultPage from "./pages/ResultPage";
import VerifyPage from "./pages/VerifyPage";
import { DEFAULT_MOBILE_ROUTE, navigateTo, readMobileRoute, type MobileRoute, type MobileRouteState } from "./router";
import { loadRecentEvents } from "./services/attendance-log";
import { loadEnrollmentSummary } from "./services/enrollment";
import { bindStaffIdWithValidation, clearBoundStaffId } from "./services/staff-binding";
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

  useEffect(() => {
    const onPopState = () => setRouteState(readMobileRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (window.location.pathname !== routeState.route) {
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
  }, [refreshEnrollment, refreshRecentEvents]);

  useEffect(() => {
    if (!dbReady) {
      return;
    }
    if (routeState.route === "/m/home" || routeState.route === "/m/history") {
      void refreshRecentEvents();
    }
    if (routeState.route === "/m/home" || routeState.route === "/m/profile") {
      void refreshEnrollment();
    }
  }, [dbReady, refreshEnrollment, refreshRecentEvents, routeState.route]);

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

  const verifyAction = useMemo(() => parseVerifyAction(routeState.search), [routeState.search]);
  const handleNavigate = useCallback((route: MobileRoute) => navigateTo(route), []);
  const handleNavigatePath = useCallback((path: string) => navigateTo(path), []);

  const handleStartEnrollment = useCallback(() => {
    if (!staffBound) {
      setAppError("No staff is bound to this device. Please bind Staff ID in Profile first.");
      navigateTo("/m/profile");
      return;
    }
    setAppNotice(null);
    setEnrollConsentAcceptedAt(null);
    setEnrollDescriptors([]);
    setEnrollPhotos([]);
    navigateTo("/m/enroll/consent");
  }, [staffBound]);

  useEffect(() => {
    if (routeState.route === "/m/verify" && enrollStatus !== "ACTIVE") {
      handleStartEnrollment();
    }
  }, [enrollStatus, handleStartEnrollment, routeState.route]);

  const handleBindStaff = useCallback(async (nextStaffId: string) => {
    try {
      const staff = await bindStaffIdWithValidation(nextStaffId);
      setAppError(null);
      setAppNotice(`Bound to ${staff.staffId} (${staff.name}).`);
      await refreshEnrollment();
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Failed to bind staff.");
    }
  }, [refreshEnrollment]);

  const handleClearStaffBinding = useCallback(async () => {
    clearBoundStaffId();
    setEnrollStatus("PENDING_CONSENT");
    setDescriptorCount(0);
    setStaffBound(false);
    setStaffId(null);
    setStaffName(null);
    setAppNotice("Staff binding cleared. Bind another staff to continue.");
    await refreshEnrollment();
  }, [refreshEnrollment]);

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
  const banner = appError ? <div className="ui-banner-error">{appError}</div> : appNotice ? <div className="ui-banner-success">{appNotice}</div> : null;

  let content: ReactNode;
  if (currentRoute === "/m/enroll/consent") {
    content = <EnrollConsentPage onBack={() => navigateTo("/m/home")} onAccepted={handleConsentAccepted} />;
  } else if (currentRoute === "/m/enroll/capture") {
    content = (
      <EnrollCapturePage
        consentAcceptedAt={enrollConsentAcceptedAt}
        initialDescriptors={enrollDescriptors}
        initialPhotos={enrollPhotos}
        onBack={() => navigateTo("/m/enroll/consent")}
        onReset={() => {
          setEnrollDescriptors([]);
          setEnrollPhotos([]);
        }}
        onCompleted={handleCaptureCompleted}
      />
    );
  } else if (currentRoute === "/m/enroll/liveness") {
    content = (
        <EnrollLivenessPage
          consentAcceptedAt={enrollConsentAcceptedAt}
          descriptors={enrollDescriptors}
          photos={enrollPhotos}
          onBack={() => navigateTo("/m/enroll/capture")}
          onRestart={handleStartEnrollment}
          onSaved={handleEnrollmentSaved}
      />
    );
  } else if (currentRoute === "/m/verify") {
    content = (
      <VerifyPage action={verifyAction} onBack={() => navigateTo("/m/home")} onCompleted={handleVerifyCompleted} />
    );
  } else if (currentRoute === "/m/result") {
    content = (
      <ResultPage currentRoute={currentRoute} result={lastResult} onNavigatePath={handleNavigatePath} onNavigate={handleNavigate} />
    );
  } else if (currentRoute === "/m/history") {
    content = (
      <HistoryPage
        currentRoute={currentRoute}
        staffName={staffName}
        events={recentEvents}
        onNavigate={handleNavigate}
      />
    );
  } else if (currentRoute === "/m/profile") {
    content = (
      <ProfilePage
        currentRoute={currentRoute}
        dbReady={dbReady}
        enrollStatus={enrollStatus}
        descriptorCount={descriptorCount}
        staffBound={staffBound}
        staffId={staffId}
        staffName={staffName}
        online={online}
        onStartEnrollment={handleStartEnrollment}
        onBindStaff={handleBindStaff}
        onClearStaffBinding={handleClearStaffBinding}
        onNavigate={handleNavigate}
      />
    );
  } else {
    content = (
      <HomePage
        currentRoute={currentRoute}
        dbReady={dbReady}
        enrollStatus={enrollStatus}
        staffBound={staffBound}
        staffName={staffName}
        online={online}
        latestSyncState={latestSyncState}
        recentEvents={recentEvents}
        onAction={handleAction}
        onStartEnrollment={handleStartEnrollment}
        onNavigate={handleNavigate}
      />
    );
  }

  return <>{banner}{content}</>;
}
