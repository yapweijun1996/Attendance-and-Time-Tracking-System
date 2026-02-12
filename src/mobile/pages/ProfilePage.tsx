import { useState } from "react";

import DesktopSidebar from "../components/DesktopSidebar";
import MobileTabBar from "../components/MobileTabBar";
import type { MobileRoute } from "../router";
import type { EnrollStatus } from "../types";

interface ProfilePageProps {
  currentRoute: MobileRoute;
  dbReady: boolean;
  enrollStatus: EnrollStatus;
  descriptorCount: number;
  staffBound: boolean;
  staffId: string | null;
  staffName: string | null;
  online: boolean;
  onStartEnrollment: () => void;
  onBindStaff: (staffId: string) => void;
  onClearStaffBinding: () => void;
  onNavigate: (route: MobileRoute) => void;
}

export default function ProfilePage({
  currentRoute,
  dbReady,
  enrollStatus,
  descriptorCount,
  staffBound,
  staffId,
  staffName,
  online,
  onStartEnrollment,
  onBindStaff,
  onClearStaffBinding,
  onNavigate,
}: ProfilePageProps) {
  const [staffIdInput, setStaffIdInput] = useState(staffId ?? "");

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans">
      <DesktopSidebar
        currentRoute={currentRoute}
        staffName={staffName}
        onNavigate={onNavigate}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-32 sm:px-8 lg:pb-8 lg:pl-72">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">User Profile</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Manage your identity binding and biometric enrollment.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="ui-card bg-white p-0 overflow-hidden shadow-sm border-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Staff Identity</h2>
              <div className={`h-2.5 w-2.5 rounded-full ${staffBound ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Staff Identifier</label>
                  <div className="flex gap-2">
                    <input
                      value={staffIdInput}
                      onChange={(event) => setStaffIdInput(event.target.value.toUpperCase())}
                      className="bg-slate-50 border-slate-100 rounded-xl h-12 flex-1 px-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                      placeholder="E.G. STAFF_001"
                    />
                    <button
                      type="button"
                      onClick={() => onBindStaff(staffIdInput)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-6 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
                    >
                      Bind Account
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <p className="text-xs font-bold text-slate-500 text-center">
                    Current Status: <span className={staffBound ? "text-emerald-600" : "text-amber-600"}>{staffBound ? "Successfully Linked" : "No Account Bound"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={onClearStaffBinding}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors py-2"
                  >
                    Remove Current Link
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="ui-card bg-white p-0 overflow-hidden shadow-sm border-slate-100">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Enrollment & Diagnostics</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Face Profile</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{enrollStatus}</p>
                </div>
                <div className={`p-4 rounded-xl border ${online ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${online ? 'text-emerald-600' : 'text-slate-400'}`}>Network</p>
                  <p className={`text-lg font-black leading-none ${online ? 'text-emerald-900' : 'text-slate-900'}`}>{online ? 'Online' : 'Offline'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onStartEnrollment}
                  disabled={!staffBound}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white h-12 rounded-xl font-black text-sm shadow-lg shadow-emerald-200/50 transition-all active:scale-[0.98]"
                >
                  Face Enrollment Setup
                </button>
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Local Descriptors: {descriptorCount}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Database: {dbReady ? "READY" : "BOOTING"}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <MobileTabBar currentRoute={currentRoute} onNavigate={onNavigate} />
    </div>
  );
}
