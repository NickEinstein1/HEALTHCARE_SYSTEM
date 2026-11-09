import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { BillingPatientSummary } from "../../lib/apiTypes";
import { usePolling } from "../../hooks/usePolling";
import { BRAND_ICON } from "../../components/brand/brandIcon";
import { DashIcon } from "../../components/brand/DashIcon";
import { DashboardShell, useDashboardToast } from "../../components/dashboard/DashboardShell";
import { ESignModulePanel } from "../../components/legal/ESignModulePanel";
import { ExportMenu } from "../../components/ExportMenu";
import { BodyVitalsFigure } from "../../components/BodyVitalsFigure";

function fmtWhen(d: Date, hhmm: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${hhmm}`;
}

function parseWhenToDate(when: string): Date | null {
  // Expected formats in demo data: "15 Mar 2026 · 09:00"
  const m = when.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = m[2].toLowerCase();
  const year = Number(m[3]);
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = months.indexOf(mon);
  if (idx < 0) return null;
  const d = new Date(year, idx, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeLabel(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toNumberish(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/[^\d.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function bmiKgM2(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  if (m <= 0) return null;
  return weightKg / (m * m);
}


function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function nextWeekday(from: Date, weekday: number) {
  // weekday: 0=Sun..6=Sat. Returns a date >= from (but typically in future).
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (weekday - base.getDay() + 7) % 7;
  return addDays(base, delta === 0 ? 7 : delta);
}

function pickDefaultSelectedDay(now: Date, apptDates: Date[]) {
  const todayKey = ymd(now);
  const upcoming = apptDates
    .slice()
    .sort((a, b) => a.getTime() - b.getTime())
    .find((d) => ymd(d) >= todayKey);
  return upcoming ?? now;
}

function MonthCalendar(props: {
  monthCursor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  appointmentDates: Date[];
  onSelectDay?: (day: Date) => void;
}) {
  const { monthCursor, onPrevMonth, onNextMonth, appointmentDates, onSelectDay } = props;
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const monthLabel = useMemo(() => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[month]} ${year}`;
  }, [month, year]);

  const apptSet = useMemo(() => new Set(appointmentDates.map((d) => ymd(d))), [appointmentDates]);

  const firstOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const startDow = firstOfMonth.getDay(); // 0=Sun
  const gridStart = useMemo(() => {
    const d = new Date(firstOfMonth);
    d.setDate(d.getDate() - startDow);
    return d;
  }, [firstOfMonth, startDow]);

  const cells = useMemo(() => Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)), [gridStart]);

  const todayKey = useMemo(() => ymd(new Date()), []);

  return (
    <div className="cal">
      <div className="cal-hd">
        <button type="button" className="btn-s btn-sm" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <div className="cal-mo">{monthLabel}</div>
        <button type="button" className="btn-s btn-sm" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-dow">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="cal-dow-it">
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid" role="grid" aria-label="Appointments calendar">
        {cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const key = ymd(d);
          const hasAppt = apptSet.has(key);
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              className={`cal-day${inMonth ? "" : " dim"}${hasAppt ? " appt" : ""}${isToday ? " today" : ""}`}
              onClick={() => onSelectDay?.(d)}
              aria-label={`${key}${hasAppt ? " has appointment" : ""}`}
            >
              <span>{d.getDate()}</span>
              {hasAppt ? <i className="cal-dot" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      <div className="cal-ft">
        <span className="cal-legend">
          <i className="cal-dot" aria-hidden /> Appointment day
        </span>
        <span className="cal-legend">
          <i className="cal-today" aria-hidden /> Today
        </span>
      </div>
    </div>
  );
}

type PatientPage =
  | "home"
  | "appointments"
  | "visits"
  | "results"
  | "medications"
  | "vitals"
  | "coverage"
  | "contributions"
  | "bills"
  | "payments"
  | "records"
  | "documents"
  | "esign"
  | "profile"
  | "consent";

const PATIENT_TITLES: Record<PatientPage, string> = {
  home: "My Dashboard",
  appointments: "Appointments",
  visits: "Visit History",
  results: "Test Results",
  medications: "Medications",
  vitals: "Vitals & Trends",
  coverage: "My UniHealth Cover",
  contributions: "Contributions",
  bills: "Bills & Invoices",
  payments: "Make a Payment",
  records: "Health Records",
  documents: "Documents",
  esign: "E-Signatures",
  profile: "My Profile",
  consent: "Privacy & Consent",
};

const PATIENT_CRUMBS: Record<PatientPage, string> = {
  home: "Home",
  appointments: "Health › Appointments",
  visits: "Health › Visits",
  results: "Health › Results",
  medications: "Health › Medications",
  vitals: "Health › Vitals",
  coverage: "Payments › UniHealth Cover",
  contributions: "Payments › Contributions",
  bills: "Payments › Bills",
  payments: "Payments › Pay Now",
  records: "Records › Health Records",
  documents: "Records › Documents",
  esign: "Records › E-Signatures",
  profile: "Account › Profile",
  consent: "Privacy › Consent",
};

function pgOn(active: boolean) {
  return `pg${active ? " on" : ""}`;
}

export function PatientDashboard() {
  const toast = useDashboardToast();
  const [patientId, setPatientId] = useState("P001");
  const summary = usePolling(
    useCallback(() => api.patientSummary(patientId, 5, "patient"), [patientId]),
    { intervalMs: 7000 },
  );
  const meds = usePolling(
    useCallback(() => api.medicationRequests(patientId, 20, "patient"), [patientId]),
    { intervalMs: 10000 },
  );
  const obs = usePolling(
    useCallback(() => api.observations(patientId, 30, "patient"), [patientId]),
    { intervalMs: 6000 },
  );

  const [page, setPage] = useState<PatientPage>("home");
  const [topPanel, setTopPanel] = useState<"none" | "search" | "notifications">("none");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Appointment booking state ──────────────────────────────────────
  const liveAppts = usePolling(() => api.appointments({ patient_id: patientId }), { intervalMs: 8000 });
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingDate, setBookingDate] = useState<string>("");
  const [bookingFacility, setBookingFacility] = useState("KNH Nairobi");
  const [bookingDept, setBookingDept] = useState("Cardiology");
  const [bookingTime, setBookingTime] = useState("09:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSlots, setBookingSlots] = useState<string[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const [billing, setBilling] = useState<BillingPatientSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  const insuranceSync = usePolling(
    () => api.insuranceSync(patientId, 0, "patient"),
    { intervalMs: 8_000, enabled: page === "coverage" || page === "bills" || page === "contributions" },
  );

  const refreshBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const data = await api.billingPatientSummary(patientId, "patient");
      setBilling(data);
    } catch {
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (page === "contributions" || page === "bills" || page === "payments") {
      void refreshBilling();
    }
  }, [page, refreshBilling]);

  const payWithMpesa = useCallback(async (purpose: string, amountKes?: number, invoiceId?: string) => {
    if (payBusy) return;
    setPayBusy(true);
    try {
      const res = await api.patientPayment({
        patient_id: patientId,
        purpose,
        amount_kes: amountKes,
        invoice_id: invoiceId,
      });
      toast(res.message);
      await refreshBilling();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Payment request failed.");
    } finally {
      setPayBusy(false);
    }
  }, [patientId, payBusy, refreshBilling, toast]);

  const departments = useMemo(() => [
    "Cardiology", "Oncology", "Neurology", "Orthopaedics",
    "General Surgery", "Internal Medicine", "Paediatrics",
    "Gynaecology & Obstetrics", "Ophthalmology", "ENT",
    "Dermatology", "Psychiatry", "Outpatient", "Follow-up",
  ], []);

  const facilities = [
    "KNH Nairobi", "Coast General Hospital", "Aga Khan University Hospital",
    "MP Shah Hospital", "Kenyatta National Referral Hospital",
  ];

  const openBookModal = useCallback((dateStr?: string) => {
    setBookingDate(dateStr ?? ymd(new Date()));
    setBookingSuccess(null);
    setShowBookModal(true);
  }, []);

  useEffect(() => {
    if (!showBookModal || !bookingDate) return;
    api.appointmentSlots(bookingDate, bookingFacility, bookingDept)
      .then((r) => setBookingSlots(r.available))
      .catch(() => setBookingSlots(["08:00","09:00","10:00","11:00","14:00","15:00"]));
  }, [showBookModal, bookingDate, bookingFacility, bookingDept]);

  const submitBooking = async () => {
    if (!bookingDate || !bookingFacility || !bookingDept || !bookingTime) return;
    setBookingLoading(true);
    try {
      const res = await api.appointmentCreate({
        patient_id: patientId,
        patient_name: summary.data?.patient.given_name
          ? `${summary.data.patient.given_name} ${summary.data.patient.family_name ?? ""}`.trim()
          : "P. Mutiso",
        facility: bookingFacility,
        department: bookingDept,
        date: bookingDate,
        time: bookingTime,
        notes: bookingNotes,
        booked_by: "patient",
      });
      setBookingSuccess(res.id ?? "");
      liveAppts.refresh();
      toast(`Appointment booked at ${bookingFacility} — ${bookingDate} ${bookingTime}`);
    } catch {
      toast("Booking failed — please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const cancelAppt = async (aptId: string) => {
    try {
      await api.appointmentCancel(aptId, "Patient cancelled via portal");
      liveAppts.refresh();
      toast("Appointment cancelled.");
    } catch {
      toast("Could not cancel — please try again.");
    }
  };

  // ── Human figure vitals state ──────────────────────────────────────
  const [activeVital, setActiveVital] = useState<string | null>(null);
  const patientGender = (summary.data?.patient?.gender ?? "male") as "male" | "female";

  // ── Messaging state ────────────────────────────────────────────────
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setMsgLoading(true);
    try {
      await api.uiAction({ role: "patient", page, patient_id: patientId, label: `Message to care team: ${msgText.trim()}`, type: "message" });
      setMsgSent(true);
    } catch { /* offline */ } finally {
      setMsgLoading(false);
    }
  };

  // ── Consent state ──────────────────────────────────────────────────
  const [researchConsent, setResearchConsent] = useState(true);
  const [consentBusy, setConsentBusy] = useState(false);

  const toggleConsent = async (key: string, newVal: boolean) => {
    setConsentBusy(true);
    try {
      await api.uiAction({ role: "patient", patient_id: patientId, label: `Consent ${key} set to ${newVal}`, type: "consent" });
      if (key === "research") setResearchConsent(newVal);
      toast(newVal ? "Consent granted." : "Consent withdrawn. Your preference is saved.");
    } catch { toast("Could not save consent — please try again."); } finally {
      setConsentBusy(false);
    }
  };

  // ── Profile form state ─────────────────────────────────────────────
  const [profileFirst, setProfileFirst] = useState("Patience");
  const [profileLast, setProfileLast] = useState("Mutiso");
  const [profilePhone, setProfilePhone] = useState("0712 345 678");
  const [profileEmail, setProfileEmail] = useState("p.mutiso@example.com");
  const [profileSaving, setProfileSaving] = useState(false);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await api.uiAction({
        role: "patient", patient_id: patientId,
        label: `Profile updated: ${profileFirst} ${profileLast}`,
        type: "profile_update",
        data: { given_name: profileFirst, family_name: profileLast, phone: profilePhone, email: profileEmail },
      });
      toast("Profile saved successfully.");
    } catch { toast("Could not save profile — please try again."); } finally {
      setProfileSaving(false);
    }
  };

  // ── Triage note state ──────────────────────────────────────────────
  const [triageNote, setTriageNote] = useState("Patient appears well. No respiratory distress. Counselled on hydration and medication adherence. Safety-net advice given.");
  const [triageSaving, setTriageSaving] = useState(false);
  const [triageSaved, setTriageSaved] = useState(false);

  const saveTriageNote = async () => {
    if (!triageNote.trim()) { toast("Enter a clinical note before saving."); return; }
    setTriageSaving(true);
    try {
      await api.ingestObservation({
        resourceType: "Observation",
        patient_id: patientId,
        code: "clinical-note",
        value_text: triageNote,
        effective_time: new Date().toISOString(),
      });
      setTriageSaved(true);
      toast("Triage note saved to health record.");
      setTimeout(() => setTriageSaved(false), 3000);
    } catch {
      await api.uiAction({ role: "patient", patient_id: patientId, label: `Triage note: ${triageNote.slice(0, 80)}`, type: "clinical_note" }).catch(() => {});
      setTriageSaved(true);
      toast("Triage note saved.");
      setTimeout(() => setTriageSaved(false), 3000);
    } finally {
      setTriageSaving(false);
    }
  };

  // ── Document upload state ──────────────────────────────────────────
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ ico: string; n: string; d: string }>>([]);

  const handleDocUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await api.uiAction({ role: "patient", patient_id: patientId, label: `Document uploaded: ${file.name}`, type: "doc_upload" }).catch(() => {});
      setUploadedDocs((prev) => [{ ico: "📄", n: file.name, d: `Uploaded · ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` }, ...prev]);
      toast(`"${file.name}" uploaded successfully.`);
    };
    input.click();
  };

  const handleDocOpen = (docName: string) => {
    toast(`Opening "${docName}" — document viewer would load here. In production, this opens a signed download URL.`);
    void api.uiAction({ role: "patient", patient_id: patientId, label: `Document viewed: ${docName}`, type: "doc_view" }).catch(() => {});
  };

  const uiAction = async (label: string) => {
    try {
      await api.uiAction({ role: "patient", page, patient_id: patientId, label });
    } catch (e) {
      // Keep the UX clean even if the API is offline.
    }
    toast(label);
  };

  const appts = useMemo(() => {
    const live = liveAppts.data ?? [];
    if (live.length > 0) {
      return live.map((a: any) => ({
        when: `${a.date} ${a.time}`,
        where: a.facility,
        dept: a.department,
        tag: (a.status === "confirmed" ? "g" : a.status === "cancelled" ? "r" : "am") as "g" | "am" | "r",
        id: a.id,
        status: a.status,
      }));
    }
    // Demo schedule generator: always show the next two realistic appointments relative to "now".
    const now = new Date();
    const d1 = nextWeekday(now, 3); // next Wednesday
    const d2 = addDays(d1, 7); // following week
    return [
      { when: fmtWhen(d1, "09:00"), where: "KNH Nairobi", dept: "Cardiology", tag: "g" as const, id: "APT-2026-001", status: "confirmed" },
      { when: fmtWhen(d2, "14:00"), where: "Coast General Hospital", dept: "Follow-up", tag: "am" as const, id: "APT-2026-002", status: "pending" },
    ];
  }, [liveAppts.data]);

  const visits = useMemo(
    () => [
      { when: "04 Mar 2026", fac: "KNH Nairobi", type: "Outpatient", dept: "Cardiology", ref: "ENC-2026-1042" },
      { when: "12 Feb 2026", fac: "KNH Lab", type: "Lab", dept: "Phlebotomy", ref: "LAB-2026-0091" },
      { when: "03 Jan 2026", fac: "Coast General", type: "Inpatient", dept: "Internal Medicine", ref: "IP-2025-8831" },
    ],
    []
  );

  const heroFirstName = useMemo(() => {
    const g = summary.data?.patient.given_name?.trim();
    if (g) return g;
    return "there";
  }, [summary.data?.patient.given_name]);

  const displayAflId = `AFL-2024-KE-${patientId.replace(/\W/g, "").toUpperCase() || "78841209"}`;

  const vitalsCatalog = useMemo(
    () =>
      [
        { key: "bp", label: "Blood Pressure", unit: "mmHg", icon: "🩸", range: "90–120 / 60–80", match: ["blood pressure", "bp"] },
        { key: "hr", label: "Heart Rate", unit: "bpm", icon: "💗", range: "60–100", match: ["heart rate", "pulse", "hr"] },
        { key: "rr", label: "Respiratory Rate", unit: "breaths/min", icon: "🫁", range: "12–20", match: ["respiratory", "rr"] },
        { key: "temp", label: "Temperature", unit: "°C", icon: "🌡️", range: "36.1–37.2", match: ["temperature", "temp"] },
        { key: "spo2", label: "SpO₂", unit: "%", icon: "🩺", range: "≥ 95", match: ["spo2", "oxygen", "o2"] },
        { key: "weight", label: "Weight", unit: "kg", icon: "⚖️", range: "—", match: ["weight"] },
        { key: "height", label: "Height", unit: "cm", icon: "📏", range: "—", match: ["height"] },
        { key: "bmi", label: "BMI", unit: "kg/m²", icon: "🧮", range: "18.5–24.9", match: ["bmi"] },
        { key: "glucose", label: "Random Glucose", unit: "mmol/L", icon: "🩸", range: "3.9–7.8", match: ["glucose", "rbg"] },
        { key: "pain", label: "Pain Score", unit: "/10", icon: "😖", range: "0–10", match: ["pain"] },
      ] as const,
    []
  );

  const latestVitals = useMemo(() => {
    // Very lightweight mapping: match by code substring. For the demo we’ll also fall back to defaults.
    const rows = vitalsCatalog.map((v) => {
      const match = (obs.data ?? []).find((o) => {
        const c = (o.code ?? "").toLowerCase();
        return v.match.some((m) => c.includes(m));
      });
      return {
        key: v.key,
        label: v.label,
        icon: v.icon,
        unit: v.unit,
        range: v.range,
        value: match?.value_text ?? null,
        measuredAt: match?.effective_time ?? null,
      };
    });

    const weight = toNumberish(rows.find((r) => r.key === "weight")?.value);
    const height = toNumberish(rows.find((r) => r.key === "height")?.value);
    const bmi = bmiKgM2(weight, height);
    const bmiRow = rows.find((r) => r.key === "bmi");
    if (bmiRow && bmiRow.value == null && bmi != null) {
      bmiRow.value = bmi.toFixed(1);
      bmiRow.measuredAt = rows.find((r) => r.key === "weight")?.measuredAt ?? rows.find((r) => r.key === "height")?.measuredAt ?? null;
    }

    const hasAny = rows.some((r) => r.value != null);
    if (!hasAny) {
      const now = new Date();
      const demo = new Map<string, { value: string; at: string }>([
        ["bp", { value: "120/80", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["hr", { value: "72", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["rr", { value: "16", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["temp", { value: "36.8", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["spo2", { value: "98", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["weight", { value: "68", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["height", { value: "167", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["glucose", { value: "5.4", at: `${ymd(now)} ${timeLabel(now)}` }],
        ["pain", { value: "0", at: `${ymd(now)} ${timeLabel(now)}` }],
      ]);
      for (const r of rows) {
        const d = demo.get(r.key);
        if (d) {
          r.value = d.value;
          r.measuredAt = d.at;
        }
      }
      const bmi2 = bmiKgM2(68, 167);
      const bmiR = rows.find((r) => r.key === "bmi");
      if (bmiR && bmi2 != null) {
        bmiR.value = bmi2.toFixed(1);
        bmiR.measuredAt = `${ymd(now)} ${timeLabel(now)}`;
      }
    }

    return rows;
  }, [obs.data, vitalsCatalog]);

  const apptDates = useMemo(
    () => appts.map((a) => parseWhenToDate(a.when)).filter((d): d is Date => !!d),
    [appts]
  );
  const [apptMonthCursor, setApptMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedApptDay, setSelectedApptDay] = useState<Date | null>(() => pickDefaultSelectedDay(new Date(), apptDates));

  useEffect(() => {
    if (page !== "appointments") return;
    const now = new Date();
    const defaultSelected = pickDefaultSelectedDay(now, apptDates);
    setSelectedApptDay((cur) => cur ?? defaultSelected);
    setApptMonthCursor((cur) => {
      // Keep calendar grounded: if user hasn't navigated away from the current period,
      // default to the month containing the upcoming appointment (or current month).
      const desired = startOfMonth(defaultSelected);
      if (isSameMonth(cur, desired)) return cur;
      // If current cursor month is neither now nor the desired appointment month, snap to desired.
      const curIsNow = isSameMonth(cur, now);
      const curIsDesired = isSameMonth(cur, desired);
      if (curIsNow || curIsDesired) return cur;
      return desired;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, apptDates.length]);

  const searchItems = useMemo(
    () =>
      [
        { key: "appointments", label: "Appointments", sub: "Scheduling · Book, view and manage appointments", page: "appointments" as PatientPage, icon: "📅" },
        { key: "visits", label: "Visit History", sub: "Clinical history · Encounters and facilities", page: "visits" as PatientPage, icon: "📋" },
        { key: "results", label: "Test Results", sub: "Laboratory · Observations and diagnostics", page: "results" as PatientPage, icon: "🧪" },
        { key: "medications", label: "Medications", sub: "Pharmacy · Active prescriptions", page: "medications" as PatientPage, icon: "💊" },
        { key: "vitals", label: "Vitals & Trends", sub: "Monitoring · Latest vitals and charts", page: "vitals" as PatientPage, icon: "💗" },
        { key: "coverage", label: "My UniHealth Cover", sub: "Payments · Benefits and claims", page: "coverage" as PatientPage, icon: "🛡️" },
        { key: "contributions", label: "Contributions", sub: "Payments · Monthly payment history", page: "contributions" as PatientPage, icon: "💳" },
        { key: "bills", label: "Bills & Invoices", sub: "Finance · Statements and invoices", page: "bills" as PatientPage, icon: "📄" },
        { key: "payments", label: "Make a Payment", sub: "Payments · Methods and recent transactions", page: "payments" as PatientPage, icon: "📱" },
        { key: "records", label: "Health Records", sub: "Records · Longitudinal record", page: "records" as PatientPage, icon: "📂" },
        { key: "documents", label: "Documents", sub: "Records · Reports and files", page: "documents" as PatientPage, icon: "📋" },
        { key: "esign", label: "E-Signatures", sub: "Legal · POA & consent forms", page: "esign" as PatientPage, icon: "✍️" },
        { key: "profile", label: "My Profile", sub: "Account · Personal details", page: "profile" as PatientPage, icon: "👤" },
        { key: "consent", label: "Privacy & Consent", sub: "Privacy · KDPA 2019 controls", page: "consent" as PatientPage, icon: "🔐" },
      ] as const,
    []
  );

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchItems;
    return searchItems.filter((x) => (x.label + " " + x.sub).toLowerCase().includes(q));
  }, [searchItems, searchQuery]);

  const notifications = useMemo(
    () => [
      { icon: "🧪", title: "New lab result posted", sub: "Potassium (K⁺) flagged high · Review details in Test Results", go: "results" as PatientPage, time: "2m" },
      { icon: "📅", title: "Appointment reminder", sub: "KNH Cardiology · 15 Mar 2026 · 09:00", go: "appointments" as PatientPage, time: "1h" },
      { icon: "💳", title: "Contribution due", sub: "Ksh 500 due by 31 Mar 2026", go: "contributions" as PatientPage, time: "2d" },
    ],
    []
  );

  return (
    <DashboardShell
      shellVariant="patient"
      title={PATIENT_TITLES[page]}
      crumb={PATIENT_CRUMBS[page]}
      portalSubtitle="Patient Portal · UniHealth"
      userInitials="PM"
      userName="P. Mutiso"
      userEmail="p.mutiso@example.com"
      activeNavId={page}
      onNavSelect={(id) => setPage(id as PatientPage)}
      topbarSearchPlaceholder="Search records, results, bills…"
      topbarSearchValue={searchQuery}
      onTopbarSearchChange={(v) => {
        setSearchQuery(v);
        if (topPanel !== "search") setTopPanel("search");
      }}
      onTopbarSearchFocus={() => setTopPanel("search")}
      onTopbarSearchKeyDown={(e) => {
        if (e.key === "Escape") setTopPanel("none");
        if (e.key === "Enter") {
          const first = filteredSearchItems[0];
          if (first) {
            setPage(first.page);
            setTopPanel("none");
          }
        }
      }}
      onTopbarNotificationsClick={() => setTopPanel((p) => (p === "notifications" ? "none" : "notifications"))}
      onTopbarStatusClick={() => setPage("coverage")}
      nav={[
        {
          label: "My Health",
          items: [
            { id: "home", icon: "🏠", label: "My Dashboard" },
            { id: "appointments", icon: "📅", label: "Appointments", badge: { text: "2", tone: "amber" } },
            { id: "visits", icon: "📋", label: "Visit History" },
            { id: "results", icon: "🧪", label: "Test Results" },
            { id: "medications", icon: "💊", label: "Medications" },
            { id: "vitals", icon: "💗", label: "Vitals & Trends" },
          ],
        },
        {
          label: "Payments",
          items: [
            { id: "coverage", icon: "🛡️", label: "My UniHealth Cover" },
            { id: "contributions", icon: "💳", label: "Contributions" },
            { id: "bills", icon: "📄", label: "Bills & Invoices" },
            { id: "payments", icon: "📱", label: "Make a Payment" },
          ],
        },
        {
          label: "Privacy & Security",
          items: [{ id: "consent", icon: "🔐", label: "Privacy & Consent" }],
        },
        {
          label: "My Records",
          items: [
            { id: "records", icon: "📂", label: "Health Records" },
            { id: "documents", icon: "📋", label: "Documents" },
            { id: "esign", icon: "✍️", label: "E-Signatures" },
            { id: "profile", icon: "👤", label: "My Profile" },
          ],
        },
      ]}
    >
      <div className="patient">
        {topPanel !== "none" && (
          <div className="overlay-panel" aria-live="polite">
            <div className="overlay-panel-in">
              <div className="overlay-hd">
                <div className="overlay-ti">{topPanel === "search" ? "Search" : "Notifications"}</div>
                <button className="btn-s btn-sm" type="button" onClick={() => setTopPanel("none")}>
                  Close
                </button>
              </div>
              <div className="overlay-bd">
                {topPanel === "search" ? (
                  <>
                    <div style={{ marginBottom: 10, fontSize: 11, color: "var(--t3)" }}>
                      Tip: press <span className="mono">Enter</span> to open the first match, <span className="mono">Esc</span> to close.
                    </div>
                    {filteredSearchItems.slice(0, 10).map((x) => (
                      <div
                        key={x.key}
                        className="ov-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setPage(x.page);
                          setTopPanel("none");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setPage(x.page);
                            setTopPanel("none");
                          }
                        }}
                      >
                        <div className="ov-ico" aria-hidden>
                          <DashIcon icon={x.icon} idPrefix={`search-${x.key}`} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ov-title">{x.label}</div>
                          <div className="ov-sub">{x.sub}</div>
                        </div>
                        <div className="ov-k">Go →</div>
                      </div>
                    ))}
                    {filteredSearchItems.length === 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No matches. Try “results”, “bills”, or “consent”.</div>
                    )}
                  </>
                ) : (
                  <>
                    {notifications.map((n, idx) => (
                      <div
                        key={idx}
                        className="ov-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setPage(n.go);
                          setTopPanel("none");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setPage(n.go);
                            setTopPanel("none");
                          }
                        }}
                      >
                        <div className="ov-ico" aria-hidden>
                          <DashIcon icon={n.icon} idPrefix={`notif-${n.go}-${n.time}`} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ov-title">{n.title}</div>
                          <div className="ov-sub">{n.sub}</div>
                        </div>
                        <div className="ov-k">{n.time}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="btn-s btn-sm"
                        type="button"
                        onClick={() => {
                          void uiAction("All notifications marked as read.");
                          setTopPanel("none");
                        }}
                      >
                        Mark all as read
                      </button>
                      <button className="btn-p btn-sm" type="button" onClick={() => setPage("results")}>
                        Review results
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={pgOn(page === "home")} id="pg-home">
          <div className="hero">
            <div className="hero-in">
              <div className="hero-top">
                <div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9,
                      letterSpacing: 2,
                      color: "rgba(255,255,255,.4)",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Your health at a glance
                  </div>
                  <div className="hero-greet">
                    Good morning, <em>{heroFirstName}</em> <DashIcon icon="👋" />
                  </div>
                  <div className="hero-sub">All your health information, in one secure place.</div>
                </div>
                <div className="hero-ids">
                  <div className="id-pill">
                    <b>AFL-ID:</b> {displayAflId}
                  </div>
                  <div className="id-pill">
                    <b>Member:</b> AFL-MBR-884321
                  </div>
                  <div className="id-pill">
                    <b>Cover:</b> UniHealth Active ✅
                  </div>
                </div>
              </div>
              <div className="hero-stats">
                <div className="hs">
                  <div className="hs-v">7</div>
                  <div className="hs-l">Visits this year</div>
                </div>
                <div className="hs">
                  <div className="hs-v" style={{ color: "#7beba4" }}>
                    Ksh 0
                  </div>
                  <div className="hs-l">Outstanding bills</div>
                </div>
                <div className="hs">
                  <div className="hs-v">2</div>
                  <div className="hs-l">Upcoming appts</div>
                </div>
                <div className="hs">
                  <div className="hs-v" style={{ color: "#7beba4" }}>
                    Active
                  </div>
                  <div className="hs-l">Cover status</div>
                </div>
              </div>
            </div>
          </div>

          <div className="qas">
            <button type="button" className="qa" onClick={() => setPage("appointments")}>
              <span className="qa-e"><DashIcon icon="📅" /></span>
              <span className="qa-l">Book Appointment</span>
              <span className="qa-dot" />
            </button>
            <button type="button" className="qa" onClick={() => setPage("results")}>
              <span className="qa-e"><DashIcon icon="🧪" /></span>
              <span className="qa-l">Test Results</span>
            </button>
            <button type="button" className="qa" onClick={() => setPage("payments")}>
              <span className="qa-e"><DashIcon icon="📱" /></span>
              <span className="qa-l">Make a Payment</span>
            </button>
            <button type="button" className="qa" onClick={() => setPage("records")}>
              <span className="qa-e"><DashIcon icon="📂" /></span>
              <span className="qa-l">My Records</span>
            </button>
            <button
              type="button"
              className="qa"
              onClick={() => { setMsgSent(false); setMsgText(""); setShowMsgModal(true); }}
            >
              <span className="qa-e"><DashIcon icon="💬" /></span>
              <span className="qa-l">Message Doctor</span>
            </button>
          </div>

          <div className="demo-id-bar">
            <label htmlFor="pat-demo-id">Gateway patient ID</label>
            <input
              id="pat-demo-id"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. P001"
              autoComplete="off"
            />
            <span className="tag g dot">LIVE</span>
          </div>

          {(summary.error || meds.error || obs.error) && (
            <div className="errbanner is-visible" role="alert">
              <span><DashIcon icon="⚠️" /></span>
              <span>
                {summary.error ?? meds.error ?? obs.error} (Start the API and try <code>P001</code>.)
              </span>
            </div>
          )}

          <div className="g2">
            <div>
              <div className="ai-widget green" style={{ animationDelay: ".1s" }}>
                <div className="ai-widget-hd">
                  <div>
                    <div className="ai-widget-ti">
                      <DashIcon icon="🤖" /> AI Health Insights — {summary.data ? `${summary.data.patient.given_name ?? "You"}` : "Demo patient"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 2 }}>
                      Personalised analysis based on your latest results & vitals
                    </div>
                  </div>
                  <span className="kdpa-badge"><DashIcon icon="🔒" /> KDPA 2019</span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico"><DashIcon icon="⚠️" /></span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Potassium levels require follow-up</div>
                    <div className="ai-row-su">
                      Your latest test (K⁺ 6.8 mmol/L, 2 Apr 2026) is above the safe range. Your doctor has been notified. Please attend your
                      follow-up appointment on <strong>10 Apr 2026</strong>.
                    </div>
                  </div>
                  <span className="tag r" style={{ flexShrink: 0, marginTop: 2 }}>
                    ACTION NEEDED
                  </span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico"><DashIcon icon="💊" /></span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Medication refill due in 5 days</div>
                    <div className="ai-row-su">
                      Amlodipine 10mg and Lisinopril 10mg are due for refill by 15 Apr 2026. Request a repeat prescription from your nearest UniHealth
                      facility or via this portal.
                    </div>
                  </div>
                  <span className="tag am" style={{ flexShrink: 0, marginTop: 2 }}>
                    REMINDER
                  </span>
                </div>
                <div className="ai-row">
                  <span className="ai-row-ico"><DashIcon icon="💡" /></span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Preventive care: annual eye check overdue</div>
                    <div className="ai-row-su">
                      As a patient with hypertension risk factors, an annual fundoscopy is recommended. Book via your UniHealth cover (optical benefit:
                      Ksh 3,500 remaining).
                    </div>
                  </div>
                  <span className="tag b" style={{ flexShrink: 0, marginTop: 2 }}>
                    PREVENTIVE
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    background: "rgba(10,74,38,.05)",
                    border: "1px solid rgba(10,74,38,.1)",
                    borderRadius: 7,
                    fontSize: 10.5,
                    color: "var(--gd)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <DashIcon icon="🔒" /> AI insights are generated from your own health records only. Your data is never shared without your consent (KDPA 2019).
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 16, animationDelay: ".06s" }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Upcoming Appointments</div>
                    <div className="pnl-su">Next 30 days</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("appointments")}>
                    Book new →
                  </span>
                </div>
                <div className="pnl-bd">
                  {appts.map((a) => (
                    <div
                      key={a.when}
                      style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--bdr)" }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: "var(--t1)" }}>{a.dept}</div>
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                          {a.where} · <span className="mono">{a.when}</span>
                        </div>
                      </div>
                      <span className={`tag ${a.tag}`}>{a.tag === "g" ? "Confirmed" : "Pending"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel" style={{ marginBottom: 16, animationDelay: ".1s" }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Active Medications</div>
                    <div className="pnl-su">Current prescriptions · gateway</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("medications")}>
                    All meds →
                  </span>
                </div>
                <div className="pnl-bd">
                  {(meds.data ?? []).slice(0, 5).map((m) => (
                    <div className="med" key={m.id}>
                      <div className="med-ico" style={{ background: "var(--gl)", border: "1px solid var(--gm)" }}>
                        <DashIcon icon="💊" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="med-name">{m.medication_code ?? "Medication"}</div>
                        <div className="med-dose">{m.dosage_text ?? "—"}</div>
                        <div className="med-ref">
                          Request ID: <span className="mono">{m.id}</span>
                        </div>
                      </div>
                      <div className="med-next" style={{ color: "var(--t3)" }}>
                        {m.status ?? "—"}
                      </div>
                    </div>
                  ))}
                  {!meds.loading && (meds.data?.length ?? 0) === 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No medication requests found for this ID.</div>
                  )}
                </div>
              </div>

              <div className="panel" style={{ animationDelay: ".14s" }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Recent Test Results</div>
                    <div className="pnl-su">Latest lab work & observations</div>
                  </div>
                  <span className="pnl-lk" onClick={() => setPage("results")}>
                    All results →
                  </span>
                </div>
                <div className="pnl-bd">
                  {(obs.data ?? []).slice(0, 4).map((o) => (
                    <div key={o.id} className="res" onClick={() => setPage("results")} role="presentation">
                      <span className="res-ind norm" />
                      <div>
                        <div className="res-name">{o.code ?? "Observation"}</div>
                        <div className="res-range">{o.effective_time ?? "—"}</div>
                      </div>
                      <div className="res-val norm">{(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}</div>
                    </div>
                  ))}
                  {(obs.data?.length ?? 0) === 0 && !obs.loading && (
                    <>
                      <div className="res" onClick={() => setPage("results")} role="presentation">
                        <span className="res-ind high" />
                        <div>
                          <div className="res-name">Potassium (K⁺)</div>
                          <div className="res-range">Ref: 3.5–5.1 mmol/L</div>
                        </div>
                        <div className="res-val high">6.8</div>
                        <div className="res-dt">2 Apr</div>
                      </div>
                      <div className="res" onClick={() => setPage("results")} role="presentation">
                        <span className="res-ind norm" />
                        <div>
                          <div className="res-name">LDL Cholesterol</div>
                          <div className="res-range">{"Ref: < 3.0 mmol/L"}</div>
                        </div>
                        <div className="res-val high">3.4</div>
                        <div className="res-dt">4 Mar</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="cover-card patient-card-in" style={{ marginBottom: 16, animationDelay: ".08s" }}>
                <div className="cover-top">
                  <div className="cover-emblem"><DashIcon icon="🛡️" /></div>
                  <div className="cover-in">
                    <div className="cover-lbl">UniHealth Annual Cover Balance</div>
                    <div className="cover-amt">Ksh 48,200</div>
                    <div className="cover-sub">of Ksh 50,000 remaining · FY 2025/26</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <div className="cover-chip"><DashIcon icon="✅" /> Cover Active</div>
                      <div className="cover-chip">AFL-MBR-884321</div>
                      <div className="cover-chip">M-TIBA Linked</div>
                    </div>
                  </div>
                </div>
                <div className="cover-bot">
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--t3)", marginBottom: 4 }}>
                      <span>Used: Ksh 1,800</span>
                      <span>Ksh 48,200 left</span>
                    </div>
                    <div className="pbar">
                      <div className="pbar-f" style={{ width: "96.4%", background: "var(--g)" }} />
                    </div>
                  </div>
                  <div className="cover-limits">
                    <div className="cover-lim">
                      <div className="cv-v" style={{ color: "var(--g)" }}>
                        Ksh 25K
                      </div>
                      <div className="cv-l">Inpatient limit</div>
                      <div className="pbar" style={{ marginTop: 5 }}>
                        <div className="pbar-f" style={{ width: "90%", background: "var(--g)" }} />
                      </div>
                    </div>
                    <div className="cover-lim">
                      <div className="cv-v" style={{ color: "var(--b)" }}>
                        Ksh 15K
                      </div>
                      <div className="cv-l">Outpatient limit</div>
                      <div className="pbar" style={{ marginTop: 5 }}>
                        <div className="pbar-f" style={{ width: "88%", background: "var(--b)" }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 11, display: "flex", gap: 7 }}>
                    <button type="button" className="btn-s btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPage("coverage")}>
                      View Cover
                    </button>
                    <button type="button" className="btn-p btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setPage("contributions")}>
                      Contributions
                    </button>
                  </div>
                </div>
              </div>

              <div className="panel patient-card-in" style={{ marginBottom: 16, animationDelay: ".12s" }}>
                <div className="pnl-hd">
                  <div className="pnl-ti">Health Score</div>
                  <span
                    className="pnl-lk"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      toast(
                        "Health Score is illustrative: it blends medication adherence, visit attendance, and preventive screenings. Not a clinical diagnosis."
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toast(
                          "Health Score is illustrative: it blends medication adherence, visit attendance, and preventive screenings. Not a clinical diagnosis."
                        );
                      }
                    }}
                  >
                    About this
                  </span>
                </div>
                <div className="pnl-bd">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div className="ring-wrap">
                      <svg width="90" height="90" viewBox="0 0 90 90" aria-hidden>
                        <circle className="ring-track" cx="45" cy="45" r="37" strokeDasharray="232" strokeDashoffset="0" />
                        <circle className="ring-fill" cx="45" cy="45" r="37" strokeDasharray="232" strokeDashoffset="51" />
                      </svg>
                      <div className="ring-lbl">
                        <div className="ring-num">78</div>
                        <div className="ring-max">/100</div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--g)", marginBottom: 5 }}>Good</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.6 }}>Based on vitals, visit history and medication adherence.</div>
                    </div>
                  </div>
                  <div className="prog-row">
                    <span className="prog-lbl">Medication adherence</span>
                    <div className="prog-tr">
                      <div className="prog-f" style={{ width: "90%", background: "var(--g)" }} />
                    </div>
                    <span className="prog-val">90%</span>
                  </div>
                  <div className="prog-row">
                    <span className="prog-lbl">Appointment attendance</span>
                    <div className="prog-tr">
                      <div className="prog-f" style={{ width: "75%", background: "var(--b)" }} />
                    </div>
                    <span className="prog-val">75%</span>
                  </div>
                  <div className="prog-row">
                    <span className="prog-lbl">Screenings up to date</span>
                    <div className="prog-tr">
                      <div className="prog-f" style={{ width: "60%", background: "var(--am)" }} />
                    </div>
                    <span className="prog-val">60%</span>
                  </div>
                </div>
              </div>

              <div className="ref-card patient-card-in" style={{ animationDelay: ".16s" }}>
                <div className="ref-ico"><DashIcon icon="📋" /></div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e3a8a", marginBottom: 3 }}>Active Referral</div>
                  <div style={{ fontSize: 11, color: "#2563eb", lineHeight: 1.5 }}>
                    Dr. Amina Wanjiru referred you to <strong>KNH Cardiology</strong> on 28 Feb 2026.
                    <br />
                    Appointment: 15 Mar 2026 at 10:00 AM
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button type="button" className="btn-s btn-sm" onClick={() => setPage("appointments")}>
                      View referral →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "appointments")} id="pg-appointments">
          <div className="ph">
            <div>
              <div className="ph-ey">Scheduling</div>
              <div className="ph-ti">My Appointments</div>
              <div className="ph-su">Book, view and manage your clinic visits</div>
            </div>
            <button
              className="btn-p"
              type="button"
              onClick={() => openBookModal()}
            >
              + Book Appointment
            </button>
          </div>
          <div className="notice g">
            <span className="notice-ico"><DashIcon icon="📅" /></span>
            <div className="notice-txt">
              You have <strong>{appts.length} upcoming appointment{appts.length === 1 ? "" : "s"}</strong> — next on{" "}
              <strong>{appts[0]?.when ?? "—"}</strong>.
            </div>
          </div>
          <div className="g2">
            <div>
              <div className="g2e" style={{ marginBottom: 16 }}>
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-ti">Upcoming</div>
                  </div>
                  <div className="pnl-bd">
                    {appts.filter((a) => a.status !== "cancelled" && a.status !== "completed").map((a) => (
                      <div
                        key={a.id ?? a.when}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          padding: "10px 0",
                          borderBottom: "1px solid var(--bdr)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const d = parseWhenToDate(a.when);
                              if (d) {
                                setSelectedApptDay(d);
                                setApptMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              const d = parseWhenToDate(a.when);
                              if (d) {
                                setSelectedApptDay(d);
                                setApptMonthCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                              }
                            }}
                            style={{ cursor: "pointer", flex: 1 }}
                          >
                            <div style={{ fontWeight: 800 }}>{a.dept}</div>
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
                              {a.where} · <span className="mono">{a.when}</span>
                            </div>
                          </div>
                          <span className={`tag ${a.tag}`}>{a.status === "confirmed" ? "Confirmed" : a.status === "cancelled" ? "Cancelled" : "Pending"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="btn-s btn-sm"
                            style={{ fontSize: 10.5, padding: "3px 10px" }}
                            onClick={() => {
                              const d = parseWhenToDate(a.when);
                              openBookModal(d ? ymd(d) : undefined);
                            }}
                          >
                            Reschedule
                          </button>
                          {a.status !== "cancelled" && (
                            <button
                              type="button"
                              className="btn-sm"
                              style={{ fontSize: 10.5, padding: "3px 10px", background: "rgba(255,50,80,0.12)", color: "var(--r)", border: "1px solid rgba(255,50,80,0.25)", borderRadius: 6 }}
                              onClick={() => a.id && void cancelAppt(a.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {appts.filter((a) => a.status !== "cancelled" && a.status !== "completed").length === 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--t3)", padding: "8px 0" }}>
                        No upcoming appointments.{" "}
                        <button type="button" className="pnl-lk" onClick={() => openBookModal()}>Book now →</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-ti">Past Appointments</div>
                  </div>
                  <div className="pnl-bd">
                    <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No past appointments in the selected range.</div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Book at a Facility</div>
                    <div className="pnl-su">UniHealth-accredited facilities near you</div>
                  </div>
                </div>
                <div className="pnl-bd">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {facilities.map((fac) => (
                      <button
                        key={fac}
                        type="button"
                        className="btn-s btn-sm"
                        style={{ justifyContent: "space-between", textAlign: "left", width: "100%" }}
                        onClick={() => { setBookingFacility(fac); openBookModal(); }}
                      >
                        <span className="facility-mark"><DashIcon icon={BRAND_ICON} idPrefix={`fac-${fac}`} /> {fac}</span>
                        <span style={{ fontSize: 10, opacity: 0.6 }}>Book →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="panel" style={{ position: "sticky", top: 10 }}>
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Calendar</div>
                    <div className="pnl-su">Click a date to book an appointment</div>
                  </div>
                  {selectedApptDay ? <span className="tag g dot">{selectedApptDay.toDateString().slice(4, 10)}</span> : null}
                </div>
                <div className="pnl-bd">
                  <MonthCalendar
                    monthCursor={apptMonthCursor}
                    onPrevMonth={() => setApptMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    onNextMonth={() => setApptMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    appointmentDates={apptDates}
                    onSelectDay={(d) => setSelectedApptDay(d)}
                  />

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "var(--t2)", marginBottom: 6 }}>Selected day</div>
                    {selectedApptDay ? (
                      <div>
                        <div style={{ fontSize: 12, color: "var(--t1)", marginBottom: 8 }}>
                          <span className="mono">{ymd(selectedApptDay)}</span>
                          <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>
                            {appts.filter((a) => {
                              const d = parseWhenToDate(a.when);
                              return d ? ymd(d) === ymd(selectedApptDay) : false;
                            }).length > 0
                              ? "You have an appointment on this day."
                              : "No appointments — click below to book."}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-p btn-sm"
                          style={{ width: "100%", justifyContent: "center" }}
                          onClick={() => openBookModal(ymd(selectedApptDay))}
                        >
                          <DashIcon icon="📅" /> Book for {selectedApptDay.toDateString().slice(4, 10)}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--t3)" }}>Pick a day in the calendar.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "visits")} id="pg-visits">
          <div className="ph">
            <div>
              <div className="ph-ey">Clinical History</div>
              <div className="ph-ti">Visit History</div>
              <div className="ph-su">All hospital and clinic visits linked to your UniHealth record</div>
            </div>
            <ExportMenu
              label="Export Records"
              config={{
                filename: "visit-history",
                printTitle: "UniHealth – Visit History",
                rows: visits.map((v) => ({ date: v.when, facility: v.fac, type: v.type, department: v.dept, reference: v.ref })),
              }}
              onExported={(fmt) => toast(`Visit history exported as ${fmt.toUpperCase()}.`)}
            />
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">All Visits</div>
                <div className="pnl-su">UniHealth verified · Demo rows</div>
              </div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Facility</th>
                    <th>Type</th>
                    <th>Department</th>
                    <th className="mono">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.ref}>
                      <td className="mono">{v.when}</td>
                      <td style={{ fontWeight: 700 }}>{v.fac}</td>
                      <td>{v.type}</td>
                      <td>{v.dept}</td>
                      <td className="mono">{v.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "results")} id="pg-results">
          <div className="ph">
            <div>
              <div className="ph-ey">Laboratory</div>
              <div className="ph-ti">Test Results</div>
              <div className="ph-su">Lab results, imaging and diagnostics</div>
            </div>
            <ExportMenu
              label="Download Results"
              config={{
                filename: "test-results",
                printTitle: "UniHealth – Test Results",
                rows: (obs.data ?? []).map((o) => ({ id: o.id, code: o.code ?? "", value: o.value_text ?? "", unit: o.unit ?? "", date: o.effective_time ?? "" })),
              }}
              onExported={(fmt) => toast(`Test results exported as ${fmt.toUpperCase()}.`)}
            />
          </div>
          <div className="notice am">
            <span className="notice-ico"><DashIcon icon="⚠️" /></span>
            <div className="notice-txt">
              <strong>1 result needs attention:</strong> LDL Cholesterol is above the normal range. Please discuss with your doctor at your next visit.
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Observations · {patientId}</div>
                <span className="pnl-lk" onClick={() => setPage("vitals")}>
                  Vitals →
                </span>
              </div>
              <div className="pnl-bd">
                {obs.error && (
                  <div className="errbanner is-visible" role="alert">
                    <span><DashIcon icon="⚠️" /></span>
                    <span>{obs.error}</span>
                  </div>
                )}
                {(obs.data ?? []).slice(0, 12).map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--bdr)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800 }}>{o.code ?? "Observation"}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
                        {o.effective_time ?? "—"}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: "var(--gd)", flexShrink: 0 }}>
                      {(o.value_text ?? "—") + (o.unit ? ` ${o.unit}` : "")}
                    </div>
                    <button
                      type="button"
                      className="btn-s btn-sm"
                      style={{ fontSize: 10.5, padding: "3px 9px", flexShrink: 0 }}
                      onClick={() => toast(`${o.code ?? "Observation"}: ${(o.value_text ?? "—")}${o.unit ? ` ${o.unit}` : ""} · Recorded: ${o.effective_time ?? "—"} · ID: ${o.id}`)}
                    >
                      View
                    </button>
                  </div>
                ))}
                {!obs.loading && (obs.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No observation results for this patient yet.</div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Previous Results</div>
              </div>
              <div className="pnl-bd">
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>HbA1c</strong> — 5.6% <span className="tag g">Normal</span> · Feb 2026
                  </div>
                  <div>
                    <strong>Chest X-ray</strong> — No acute findings <span className="tag g">Reported</span> · Jan 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "medications")} id="pg-medications">
          <div className="ph">
            <div>
              <div className="ph-ey">Pharmacy</div>
              <div className="ph-ti">My Medications</div>
              <div className="ph-su">Current prescriptions, dosage schedules and refills</div>
            </div>
            <ExportMenu
              label="Print / Export"
              config={{
                filename: "my-medications",
                printTitle: "UniHealth – My Medication List",
                rows: (meds.data ?? []).map((m: any) => ({
                  medication: m.medication_code ?? "Medication",
                  status: m.status ?? "",
                  dosage: m.dosage_text ?? "",
                  date: m.authored_on ?? "",
                })),
              }}
              onExported={(fmt) => toast(`Medication list exported as ${fmt.toUpperCase()}.`)}
            />
          </div>
          <div className="notice b">
            <span className="notice-ico"><DashIcon icon="💊" /></span>
            <div className="notice-txt">
              <strong>Refill reminder:</strong> Amlodipine 5mg is due for refill in 5 days. Request at any UniHealth-accredited pharmacy.
            </div>
          </div>
          <div className="g2e">
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Active Prescriptions</div>
              </div>
              <div className="pnl-bd">
                {(meds.data ?? []).map((m) => (
                  <div className="med" key={m.id}>
                    <div className="med-ico" style={{ background: "var(--gl)", border: "1px solid var(--gm)" }}>
                      <DashIcon icon="💊" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="med-name">{m.medication_code ?? "Medication"}</div>
                      <div className="med-dose">{m.dosage_text ?? "—"}</div>
                      <div className="med-ref">
                        <span className="mono">{m.id}</span> · {m.status ?? "—"}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button
                          type="button"
                          className="btn-p btn-sm"
                          style={{ fontSize: 10.5, padding: "3px 10px" }}
                          onClick={() => {
                            void api.uiAction({ role: "patient", patient_id: patientId, label: `Refill requested: ${m.medication_code ?? m.id}`, type: "refill_request" }).catch(() => {});
                            toast(`Refill request sent for ${m.medication_code ?? m.id}. Your pharmacist will prepare it within 24 hours.`);
                          }}
                        >
                          <DashIcon icon="💊" /> Request Refill
                        </button>
                        <button
                          type="button"
                          className="btn-s btn-sm"
                          style={{ fontSize: 10.5, padding: "3px 10px" }}
                          onClick={() => toast(`${m.medication_code ?? "Medication"} · ${m.dosage_text ?? "—"} · Status: ${m.status ?? "—"} · Ref: ${m.id}`)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!meds.loading && (meds.data?.length ?? 0) === 0 && (
                  <div style={{ fontSize: 11.5, color: "var(--t3)" }}>No active prescriptions from the gateway for this ID.</div>
                )}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Completed / Archived</div>
              </div>
              <div className="pnl-bd">
                <div style={{ fontSize: 11.5, color: "var(--t3)" }}>Archived medications appear here after course completion.</div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "vitals")} id="pg-vitals">
          <div className="ph">
            <div>
              <div className="ph-ey">Health Monitoring</div>
              <div className="ph-ti">Vitals & Trends</div>
              <div className="ph-su">A complete vitals panel typically recorded at triage and during inpatient/outpatient reviews.</div>
            </div>
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Vitals Capture Context</div>
                <div className="pnl-su">Patient identity + data source (gateway)</div>
              </div>
              <span className="tag g dot">LIVE</span>
            </div>
            <div className="pnl-bd">
              <div className="ff-row">
                <div className="ff">
                  <label>Gateway patient ID</label>
                  <input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="e.g. P001"
                    autoComplete="off"
                    className="mono"
                  />
                </div>
                <div className="ff">
                  <label>Encounter type</label>
                  <select defaultValue="triage">
                    <option value="triage">Walk-in / Triage</option>
                    <option value="opd">Outpatient review</option>
                    <option value="ipd">Inpatient ward round</option>
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.6 }}>
                This page shows the typical full set of vitals recorded on arrival (triage) and during ongoing monitoring: BP, HR, RR, Temp,
                SpO₂, Weight, Height, BMI, Glucose and Pain score.
              </div>
            </div>
          </div>
          {obs.error && (
            <div className="errbanner is-visible" role="alert">
              <span><DashIcon icon="⚠️" /></span>
              <span>{obs.error}</span>
            </div>
          )}
          <div className="g2" style={{ marginBottom: 16 }}>
            <div>
              <div className="g4" style={{ marginBottom: 16 }}>
                {latestVitals.slice(0, 8).map((v) => (
                  <div key={v.key} className="vital">
                    <div className="vital-e">
                      <DashIcon icon={v.icon} idPrefix={`vital-${v.key}`} />
                    </div>
                    <div className="vital-v">
                      {v.value ?? "—"}
                      <span className="vital-u">{v.unit}</span>
                    </div>
                    <div className="vital-l">{v.label}</div>
                    <div className="vital-s">
                      <span className="tag g dot">{v.measuredAt ? "Recorded" : "Pending"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="g2e" style={{ marginBottom: 16 }}>
                <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Full Vitals Checklist</div>
                  <div className="pnl-su">Everything typically captured at triage</div>
                </div>
                <ExportMenu
                  label="Export"
                  className="btn-s btn-sm"
                  config={{
                    filename: "vitals-checklist",
                    printTitle: "UniHealth – Vitals Checklist",
                    rows: latestVitals.map((v) => ({ vital: v.label, value: (v.value ?? "—") + (v.unit ? ` ${v.unit}` : ""), range: v.range, measured_at: v.measuredAt ?? "—" })),
                  }}
                  onExported={(fmt) => toast(`Vitals exported as ${fmt.toUpperCase()}.`)}
                />
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Vital</th>
                      <th>Latest</th>
                      <th>Range</th>
                      <th className="mono">Measured</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestVitals.map((v) => (
                      <tr key={v.key}>
                        <td style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                          <DashIcon icon={v.icon} idPrefix={`vital-row-${v.key}`} />
                          {v.label}
                        </td>
                        <td className="mono" style={{ fontWeight: 800 }}>
                          {(v.value ?? "—") + (v.unit ? ` ${v.unit}` : "")}
                        </td>
                        <td style={{ color: "var(--t3)" }}>{v.range}</td>
                        <td className="mono" style={{ color: "var(--t3)" }}>
                          {v.measuredAt ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                </div>

                <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Triage Notes (Example)</div>
                  <div className="pnl-su">What clinicians usually record alongside vitals</div>
                </div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>Chief complaint</label>
                  <input placeholder="e.g. headache, fever, chest pain…" defaultValue="Routine follow-up, no acute complaints." />
                </div>
                <div className="ff-row">
                  <div className="ff">
                    <label>AVPU / GCS</label>
                    <select defaultValue="a">
                      <option value="a">A — Alert</option>
                      <option value="v">V — Voice</option>
                      <option value="p">P — Pain</option>
                      <option value="u">U — Unresponsive</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label>Allergies</label>
                    <input placeholder="e.g. Penicillin" defaultValue="Penicillin (anaphylaxis)" />
                  </div>
                </div>
                <div className="ff">
                  <label>Clinical notes</label>
                  <textarea
                    style={{ minHeight: 90 }}
                    value={triageNote}
                    onChange={(e) => setTriageNote(e.target.value)}
                  />
                </div>
                <button
                  className={`btn-p${triageSaved ? " btn-saved" : ""}`}
                  type="button"
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={triageSaving}
                  onClick={() => void saveTriageNote()}
                >
                  {triageSaving ? "Saving…" : triageSaved ? "✓ Note Saved" : "Save triage note"}
                </button>
              </div>
                </div>
              </div>

              <div className="panel">
                <div className="pnl-hd">
                  <div>
                    <div className="pnl-ti">Blood Pressure Trend — Last 6 Months</div>
                    <div className="pnl-su">Demo trend view (will later bind to time-series observations)</div>
                  </div>
                </div>
                <div className="pnl-bd">
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 64, marginBottom: 8 }}>
                    {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m, i) => (
                      <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div
                          style={{
                            width: "100%",
                            background: "linear-gradient(to top, var(--gd), var(--g))",
                            borderRadius: 3,
                            height: 46 - i * 2,
                            ...(m === "Mar" ? { border: "2px solid var(--g)" } : {}),
                          }}
                        />
                        <span style={{ fontSize: 9.5, color: m === "Mar" ? "var(--g)" : "var(--t3)", fontWeight: m === "Mar" ? 700 : 400 }}>
                          {m}
                          {m === "Mar" ? " ✓" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)" }}>Systolic (mmHg) — trending down · Improving</div>
                </div>
              </div>
            </div>

            <div>
              <div className="panel" style={{ position: "sticky", top: 10 }}>
                <div className="pnl-bd" style={{ padding: 0 }}>
                  <BodyVitalsFigure
                    vitals={latestVitals}
                    gender={patientGender}
                    activeVital={activeVital}
                    onVitalHover={setActiveVital}
                    footerNote="This visualization is a UI aid. Clinical interpretation depends on context (age, symptoms, comorbidities, and repeat measurements)."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "coverage")} id="pg-coverage">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth Health Cover</div>
              <div className="ph-ti">My UniHealth Cover</div>
              <div className="ph-su">Your benefits, limits and claims — AFL-MBR-884321</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-s"
                type="button"
                onClick={() => {
                  void api.uiAction({ role: "patient", patient_id: patientId, label: "Link UniHealth account initiated", type: "account_link" }).catch(() => {});
                  toast("Redirecting to UniHealth account linking portal… (In production this opens the OAuth flow for your insurer/payer.)");
                }}
              >
                <DashIcon icon="🔗" /> Link Account
              </button>
              <button
                className="btn-p"
                type="button"
                onClick={() => {
                  void api.uiAction({ role: "patient", patient_id: patientId, label: "New claim submission started", type: "claim" }).catch(() => {});
                  toast("Claim form opened. Complete details for: Facility · Date · Service · Amount. Your cover coordinator will process the claim within 5 business days.");
                }}
              >
                + File a Claim
              </button>
            </div>
          </div>
          <div className="g3" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}><DashIcon icon="🛡️" /></div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--g)" }}>
                  Ksh {Math.round(insuranceSync.data?.coverage_stats?.balance_kes ?? 48_200).toLocaleString()}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Balance remaining this year</div>
                <div style={{ marginTop: 10 }}>
                  <span className="tag g dot">
                    {insuranceSync.data?.coverage_stats?.cover_active === false ? "Inactive" : "Cover Active"}
                  </span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}><DashIcon icon="💳" /></div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--b)" }}>
                  Ksh {Math.round(insuranceSync.data?.coverage_stats?.used_ytd_kes ?? 1_800).toLocaleString()}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Used so far this year</div>
                <div style={{ marginTop: 10 }}>
                  <span className="tag b">
                    {insuranceSync.data?.coverage_stats?.claims_processed ?? 3} claims processed
                  </span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}><DashIcon icon="📅" /></div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--am)" }}>
                  {insuranceSync.data?.coverage_stats?.renewal_date ?? "31 Mar 2026"}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Cover year renewal date</div>
                <div style={{ marginTop: 10 }}>
                  <span className="tag am">Sync v{insuranceSync.data?.sync_version ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Benefit Limits</div>
                  <div className="pnl-su">FY 2025/26</div>
                </div>
              </div>
              <div className="pnl-bd">
                {[
                  { l: "Inpatient Cover", w: 90, c: "var(--g)", t: "Ksh 22,500 / 25,000" },
                  { l: "Outpatient Cover", w: 88, c: "var(--b)", t: "Ksh 13,200 / 15,000" },
                ].map((b) => (
                  <div key={b.l} style={{ marginBottom: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "var(--t1)", marginBottom: 5 }}>
                      <span>{b.l}</span>
                      <span style={{ color: b.c }}>{b.t}</span>
                    </div>
                    <div className="pbar" style={{ height: 6 }}>
                      <div className="pbar-f" style={{ width: `${b.w}%`, background: b.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Recent UniHealth Claims</div>
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Claim No.</th>
                      <th>Facility</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(insuranceSync.data?.patient_claims ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ fontSize: 12, color: "var(--t3)", padding: 12 }}>
                          No claims yet — synced with UHIC every 8s
                        </td>
                      </tr>
                    ) : (
                      (insuranceSync.data?.patient_claims ?? []).map((c) => (
                        <tr key={c.claim_id}>
                          <td className="mono">{c.claim_id}</td>
                          <td>{c.encounter_id}</td>
                          <td>Ksh {Math.round(c.submitted_amount_kes).toLocaleString()}</td>
                          <td>
                            <span className={`tag ${c.status === "adjudicated" || c.status === "paid" ? "g" : c.status === "denied" ? "r" : "a"}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "contributions")} id="pg-contributions">
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth Health Cover</div>
              <div className="ph-ti">My Contributions</div>
              <div className="ph-su">Monthly UniHealth health cover payment history</div>
            </div>
            <div className="ph-r">
              <button
                className="btn-s"
                type="button"
                onClick={() => {
                  void uiAction("Statement download started.");
                }}
              >
                <DashIcon icon="📥" /> Statement
              </button>
              <button
                className="btn-p"
                type="button"
                disabled={payBusy || billingLoading}
                onClick={() => {
                  void payWithMpesa("contribution", billing?.contribution_amount_kes ?? 500);
                }}
              >
                + Make Contribution
              </button>
            </div>
          </div>
          <div className="g3" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: "18px 12px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}><DashIcon icon="📊" /></div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--t1)" }}>
                  Ksh {Math.round(billing?.total_contributions_kes ?? 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Total contributions · FY 2025/26</div>
                <div style={{ marginTop: 8 }}>
                  <span className="tag g">11 months paid</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: "18px 12px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}><DashIcon icon="✅" /></div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--g)" }}>
                  {billing?.membership_status === "up_to_date" ? "Up to Date" : "Payment Due"}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>
                  Next payment: Ksh {Math.round(billing?.next_payment_kes ?? 500).toLocaleString()}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className={`tag ${billing?.membership_status === "up_to_date" ? "g" : "a"} dot`}>
                    Ksh {Math.round(billing?.contribution_amount_kes ?? 500).toLocaleString()} due
                  </span>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-bd" style={{ textAlign: "center", padding: "18px 12px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}><DashIcon icon="📅" /></div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--t1)" }}>3 years</div>
                <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 3 }}>Total UniHealth membership</div>
                <div style={{ marginTop: 8 }}>
                  <span className="tag b">Since Jan 2023</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Contribution History</div>
                <div className="pnl-su">Payments via M-PESA, Payroll or Bank</div>
              </div>
            </div>
            <div className="pnl-bd">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(billing?.contributions?.length ? billing.contributions : []).map((row) => (
                    <tr key={`${row.date}-${row.method}`}>
                      <td className="mono">{row.date}</td>
                      <td>{row.method}</td>
                      <td>{row.amount}</td>
                      <td>
                        <span className="tag g">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                  {billingLoading && (
                    <tr>
                      <td colSpan={4}>Loading contribution history…</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Pay Your Contribution</div>
                <div className="pnl-su">
                  Ksh {Math.round(billing?.contribution_amount_kes ?? 500).toLocaleString()} due
                  {billing?.paybill ? ` · Paybill ${billing.paybill}` : ""}
                </div>
              </div>
            </div>
            <div className="pnl-bd">
              <button
                type="button"
                className="pay-m"
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => {
                  void payWithMpesa("contribution", billing?.contribution_amount_kes ?? 500);
                }}
                disabled={payBusy}
              >
                <div className="pay-logo" style={{ background: "#00b300" }}><DashIcon icon="💚" /></div>
                <div>
                  <div className="pay-name">M-PESA Paybill</div>
                  <div className="pay-desc">
                    Paybill: {billing?.paybill ?? "400100"} · Account: {billing?.account_ref ?? "UniHealth Health"}
                  </div>
                </div>
                <span className="pay-arr">›</span>
              </button>
              <button
                type="button"
                className="pay-m"
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => {
                  void uiAction("Bank transfer payment initiated.");
                  toast("PESALINK: Use your Equity, KCB, NCBA or Co-op mobile banking app. Account No: 1234567890 · Bank: Equity Bank · Ref: AFL-MBR-884321");
                }}
              >
                <div className="pay-logo" style={{ background: "var(--b)" }}><DashIcon icon="🏦" /></div>
                <div>
                  <div className="pay-name">Bank Transfer (PESALINK)</div>
                  <div className="pay-desc">Equity, KCB, NCBA, Co-op — all PESALINK banks</div>
                </div>
                <span className="pay-arr">›</span>
              </button>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "bills")} id="pg-bills">
          <div className="ph">
            <div>
              <div className="ph-ey">Finance</div>
              <div className="ph-ti">Bills & Invoices</div>
              <div className="ph-su">All charges, cover payments and outstanding bills</div>
            </div>
            <ExportMenu
              label="Download Statement"
              config={{
                filename: "billing-statement",
                printTitle: "UniHealth – Billing Statement",
                rows: [{ date: "04 Mar 2026", description: "Cardiology consult", amount: "Ksh 0", status: "Covered" }],
              }}
              onExported={(fmt) => toast(`Billing statement exported as ${fmt.toUpperCase()}.`)}
            />
          </div>
          <div className={`notice ${(billing?.outstanding_total_kes ?? 0) > 0 ? "a" : "g"}`}>
            <span className="notice-ico">
              <DashIcon icon={(billing?.outstanding_total_kes ?? 0) > 0 ? "⚠️" : "✅"} />
            </span>
            <div className="notice-txt">
              {(billing?.outstanding_total_kes ?? 0) > 0 ? (
                <>
                  <strong>Outstanding balance:</strong> Ksh {Math.round(billing?.outstanding_total_kes ?? 0).toLocaleString()}.
                  Use Make a Payment to settle via M-PESA.
                </>
              ) : (
                <>
                  <strong>All clear!</strong> You have no outstanding bills. Your UniHealth cover has settled all recent charges.
                </>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">Billing History</div>
              <div className="pnl-su">UniHealth-settled and out-of-pocket payments</div>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(billing?.bills?.length ? billing.bills : []).map((bill) => (
                      <tr key={bill.invoice_id ?? `${bill.date}-${bill.desc}`}>
                        <td className="mono">{bill.date}</td>
                        <td>{bill.desc}</td>
                        <td>{bill.amount}</td>
                        <td>
                          <span className={`tag ${bill.status === "Outstanding" ? "a" : "te"}`}>{bill.status}</span>
                        </td>
                        <td>
                          {bill.status === "Outstanding" && bill.invoice_id ? (
                            <button
                              type="button"
                              className="btn-p btn-sm"
                              style={{ fontSize: 10.5, padding: "3px 10px", marginRight: 6 }}
                              disabled={payBusy}
                              onClick={() => {
                                void payWithMpesa("invoice", bill.balance_kes ?? bill.amount_kes, bill.invoice_id);
                              }}
                            >
                              Pay
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn-s btn-sm"
                            style={{ fontSize: 10.5, padding: "3px 10px" }}
                            onClick={() => {
                              void api.uiAction({ role: "patient", patient_id: patientId, label: `Invoice downloaded: ${bill.desc} ${bill.date}`, type: "invoice_download" }).catch(() => {});
                              toast(`Invoice for ${bill.desc} (${bill.date}) downloading…`);
                            }}
                          >
                            <DashIcon icon="📥" /> Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                    {billingLoading && (
                      <tr>
                        <td colSpan={5}>Loading billing history…</td>
                      </tr>
                    )}
                  </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "payments")} id="pg-payments">
          <div className="ph">
            <div>
              <div className="ph-ey">Payments</div>
              <div className="ph-ti">Make a Payment</div>
              <div className="ph-su">Pay bills, contributions or top up your M-TIBA wallet</div>
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Payment Methods</div>
              </div>
              <div className="pnl-bd">
                <button
                  type="button"
                  className="pay-m"
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => {
                    void payWithMpesa("contribution", billing?.contribution_amount_kes ?? 500);
                  }}
                  disabled={payBusy}
                >
                  <div className="pay-logo" style={{ background: "#00b300" }}><DashIcon icon="💚" /></div>
                  <div>
                    <div className="pay-name">M-PESA</div>
                    <div className="pay-desc">
                      Safaricom M-PESA paybill {billing?.paybill ?? "400100"} or STK push
                    </div>
                  </div>
                  <span className="pay-arr">›</span>
                </button>
                <button
                  type="button"
                  className="pay-m"
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => {
                    void api.uiAction({ role: "patient", patient_id: patientId, label: "M-TIBA payment initiated", type: "payment" }).catch(() => {});
                    toast("M-TIBA Wallet balance: Ksh 3,200. Redirecting to M-TIBA payment flow… Use the M-TIBA app or dial *253# to authorise the payment.");
                  }}
                >
                  <div className="pay-logo" style={{ background: "#e8490a" }}><DashIcon icon="🟠" /></div>
                  <div>
                    <div className="pay-name">M-TIBA Health Wallet</div>
                    <div className="pay-desc">
                      Balance: Ksh {Math.round(billing?.mtiba_balance_kes ?? 0).toLocaleString()} available
                    </div>
                  </div>
                  <span className="pay-arr">›</span>
                </button>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Recent Transactions</div>
              </div>
              <div className="pnl-bd" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(billing?.transactions?.length ? billing.transactions : []).map((txn) => (
                      <tr key={`${txn.date}-${txn.type}-${txn.amount}`}>
                        <td className="mono">{txn.date}</td>
                        <td>{txn.type}</td>
                        <td>{txn.amount}</td>
                      </tr>
                    ))}
                    {billingLoading && (
                      <tr>
                        <td colSpan={3}>Loading transactions…</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti">M-TIBA Health Wallet</div>
            </div>
            <div className="pnl-bd">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 14,
                  background: "linear-gradient(135deg,#e8490a,#ff6b2b)",
                  borderRadius: 12,
                  marginBottom: 14,
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: 32 }}><DashIcon icon="🟠" /></div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>M-TIBA Balance</div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 28, letterSpacing: -0.3 }}>Ksh 3,200</div>
                  <div style={{ fontSize: 10.5, opacity: 0.65, marginTop: 2 }}>Linked to UniHealth Health Cover</div>
                </div>
                <button
                  className="btn-s"
                  type="button"
                  style={{
                    marginLeft: "auto",
                    padding: "8px 14px",
                    background: "rgba(255,255,255,.15)",
                    border: "1.5px solid rgba(255,255,255,.25)",
                    color: "#fff",
                  }}
                  onClick={() => {
                    void api.uiAction({ role: "patient", patient_id: patientId, label: "M-TIBA top-up initiated", type: "wallet_topup" }).catch(() => {});
                    toast("Opening M-TIBA top-up via M-Pesa… Dial *253# or use the M-TIBA app to load funds directly to your health wallet.");
                  }}
                >
                  Top Up
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "records")} id="pg-records">
          <div className="ph">
            <div>
              <div className="ph-ey">FHIR R5 · Encrypted · KDPA 2019</div>
              <div className="ph-ti">My Health Records</div>
              <div className="ph-su">Longitudinal health record linked to your AFL ID</div>
            </div>
            <ExportMenu
              label="Export Records"
              config={{
                filename: "health-records",
                printTitle: "UniHealth – Health Records",
                rows: [
                  { category: "Diagnosis", item: "Mild Hypertension", code: "ICD-10 I10", date: "Oct 2024", status: "Managed" },
                  { category: "Allergy", item: "Penicillin", code: "Anaphylaxis", date: "On file", status: "Active" },
                  { category: "Immunisation", item: "Influenza (Flu)", code: "", date: "Jul 2025", status: "Current" },
                ],
              }}
              onExported={(fmt) => toast(`Health records exported as ${fmt.toUpperCase()}.`)}
            />
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Diagnoses & Conditions</div>
              </div>
              <div className="pnl-bd">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--bg)", borderRadius: 8 }}>
                    <span style={{ fontSize: 18 }}><DashIcon icon="💗" /></span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--t1)" }}>Mild Hypertension</div>
                      <div style={{ fontSize: 11, color: "var(--t3)" }}>ICD-10: I10 · Diagnosed Oct 2024 · Managed</div>
                    </div>
                    <span className="tag am" style={{ marginLeft: "auto" }}>
                      Monitoring
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Allergies & Alerts</div>
              </div>
              <div className="pnl-bd">
                <div className="notice r">
                  <span className="notice-ico"><DashIcon icon="🚨" /></span>
                  <div className="notice-txt">
                    <strong>Allergy on file:</strong> Penicillin — Severe allergic reaction (anaphylaxis).
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div>
                <div className="pnl-ti">Immunisation Record</div>
                <div className="pnl-su">Verified vaccines on file</div>
              </div>
              <button
                type="button"
                className="btn-s btn-sm"
                onClick={() => {
                  void api.uiAction({ role: "patient", patient_id: patientId, label: "Vaccine appointment requested", type: "vaccine_request" }).catch(() => {});
                  toast("Vaccine appointment request submitted. Your care coordinator will contact you to schedule at a UniHealth-accredited facility.");
                }}
              >
                + Request Vaccine
              </button>
            </div>
            <div className="pnl-bd" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Vaccine</th>
                    <th>Date Given</th>
                    <th>Facility</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Influenza (Flu)</td>
                    <td className="mono">Jul 2025</td>
                    <td>Coast General</td>
                    <td className="mono">Jul 2026</td>
                    <td><span className="tag g">Current</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn-s btn-sm"
                        style={{ fontSize: 10.5, padding: "3px 9px" }}
                        onClick={() => {
                          void api.uiAction({ role: "patient", patient_id: patientId, label: "Immunisation certificate downloaded: Influenza Flu", type: "certificate_download" }).catch(() => {});
                          toast("Immunisation certificate for Influenza (Flu) · Jul 2025 · Coast General downloading… In production this generates a signed PDF certificate.");
                        }}
                      >
                        <DashIcon icon="📄" /> Certificate
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "documents")} id="pg-documents">
          <div className="ph">
            <div>
              <div className="ph-ey">My Files</div>
              <div className="ph-ti">Documents & Reports</div>
              <div className="ph-su">Medical letters, discharge summaries and certificates</div>
            </div>
            <button
              className="btn-s"
              type="button"
              onClick={handleDocUpload}
            >
              <DashIcon icon="📤" /> Upload Document
            </button>
          </div>
          <div className="g3">
            {[
              { ico: "📄", n: "Discharge summary", d: "KNH · Mar 2026" },
              { ico: "🧪", n: "Lab report PDF", d: "Coast General · Feb 2026" },
              { ico: "🩺", n: "Cardiology letter", d: "KNH · Jan 2026" },
              ...uploadedDocs,
            ].map((doc) => (
              <div key={doc.n} className="panel">
                <div className="pnl-bd" style={{ textAlign: "center", padding: 18 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}><DashIcon icon={doc.ico} /></div>
                  <div style={{ fontWeight: 800 }}>{doc.n}</div>
                  <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 6 }}>{doc.d}</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
                    <button
                      className="btn-s btn-sm"
                      type="button"
                      onClick={() => handleDocOpen(doc.n)}
                    >
                      Open
                    </button>
                    <ExportMenu
                      label="Export"
                      config={{
                        filename: doc.n.toLowerCase().replace(/\s+/g, "-"),
                        printTitle: `UniHealth – ${doc.n}`,
                        data: { document: doc.n, facility: doc.d, exportedAt: new Date().toISOString() },
                      }}
                      onExported={(fmt) => toast(`${doc.n} exported as ${fmt.toUpperCase()}.`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={pgOn(page === "esign")} id="pg-esign">
          <div className="ph">
            <div>
              <div className="ph-ey">Legal &amp; Consent</div>
              <div className="ph-ti">E-Signatures</div>
              <div className="ph-su">Power of attorney, surgical consent, and emergency authorisation with verification</div>
            </div>
          </div>
          <ESignModulePanel
            patientId={patientId}
            role="patient"
            allowCreate={["poa"]}
            active={page === "esign"}
            onToast={toast}
          />
        </div>

        <div className={pgOn(page === "profile")} id="pg-profile">
          <div className="ph">
            <div>
              <div className="ph-ey">Account</div>
              <div className="ph-ti">My Profile</div>
              <div className="ph-su">Personal details, contacts and notification preferences</div>
            </div>
            <button
              className="btn-p"
              type="button"
              disabled={profileSaving}
              onClick={() => void saveProfile()}
            >
              {profileSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
          <div className="g2e" style={{ marginBottom: 16 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Personal Details</div>
              </div>
              <div className="pnl-bd">
                <div className="ff-row">
                  <div className="ff">
                    <label>First Name</label>
                    <input value={profileFirst} onChange={(e) => setProfileFirst(e.target.value)} />
                  </div>
                  <div className="ff">
                    <label>Last Name</label>
                    <input value={profileLast} onChange={(e) => setProfileLast(e.target.value)} />
                  </div>
                </div>
                <div className="ff">
                  <label>UniHealth Patient ID</label>
                  <input readOnly className="mono" value={displayAflId} style={{ background: "rgba(255,255,255,0.04)", color: "var(--t3)" }} />
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div className="pnl-ti">Contact Details</div>
              </div>
              <div className="pnl-bd">
                <div className="ff">
                  <label>Primary Phone</label>
                  <input type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
                </div>
                <div className="ff">
                  <label>Email Address</label>
                  <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="pnl-hd">
              <div className="pnl-ti"><DashIcon icon="🔒" /> Security & Access</div>
              <div className="pnl-su">PIN, password and registered devices</div>
            </div>
            <div className="pnl-bd">
              <div className="ai-widget green" style={{ marginBottom: 12 }}>
                <div className="ai-row">
                  <span className="ai-row-ico"><DashIcon icon="🔐" /></span>
                  <div className="ai-row-body">
                    <div className="ai-row-ti">Active Session</div>
                    <div className="ai-row-su">Signed in via UniHealth PIN + Biometric MFA · TLS 1.3 encrypted · Session expires after 30 minutes of inactivity.</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-s btn-sm"
                  onClick={() => {
                    void api.uiAction({ role: "patient", patient_id: patientId, label: "Change PIN initiated", type: "change_pin" }).catch(() => {});
                    toast("PIN change flow started. You will receive an OTP on your registered phone (0712 3•• ••78) to verify before setting your new 4-digit UniHealth PIN.");
                  }}
                >
                  <DashIcon icon="🔢" /> Change PIN
                </button>
                <button
                  type="button"
                  className="btn-s btn-sm"
                  onClick={() => {
                    void api.uiAction({ role: "patient", patient_id: patientId, label: "Biometric re-enrol initiated", type: "biometric_enrol" }).catch(() => {});
                    toast("Biometric re-enrolment flow opened. Visit any UniHealth-accredited facility with a biometric reader to update your fingerprint record.");
                  }}
                >
                  <DashIcon icon="👁️" /> Re-enrol Biometric
                </button>
                <button
                  type="button"
                  className="btn-s btn-sm"
                  style={{ color: "var(--r)", borderColor: "rgba(255,50,80,0.3)" }}
                  onClick={() => {
                    void api.uiAction({ role: "patient", patient_id: patientId, label: "All sessions signed out", type: "signout_all" }).catch(() => {});
                    toast("All other sessions have been signed out. Your current session remains active.");
                  }}
                >
                  <DashIcon icon="🚪" /> Sign Out All Devices
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={pgOn(page === "consent")} id="pg-consent">
          <div className="ph">
            <div>
              <div className="ph-ey">Privacy · KDPA 2019</div>
              <div className="ph-ti">Privacy & Consent</div>
              <div className="ph-su">Your data rights · Consent management · Who has accessed your records</div>
            </div>
            <div className="ph-r">
              <span className="kdpa-badge"><DashIcon icon="🔒" /> KDPA 2019 Protected</span>
            </div>
          </div>
          <div
            style={{
              padding: "14px 18px",
              background: "var(--gl)",
              border: "1.5px solid var(--gm)",
              borderRadius: 12,
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 24 }}><DashIcon icon="🏛️" /></span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gd)", marginBottom: 5 }}>Your Rights Under Kenya&apos;s Data Protection Act (KDPA 2019)</div>
              <div style={{ fontSize: 11.5, color: "var(--t2)", lineHeight: 1.7 }}>
                You have the right to: <strong>Access</strong> your health data · <strong>Rectify</strong> incorrect information · <strong>Erase</strong> data in certain
                circumstances · <strong>Portability</strong> — receive your data in a usable format · <strong>Object</strong> to certain processing ·{" "}
                <strong>Withdraw</strong> consent at any time.
              </div>
            </div>
          </div>
          <div className="g2e" style={{ marginBottom: 18 }}>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Consent Management</div>
                  <div className="pnl-su">Control how your health data is used</div>
                </div>
                <span className="tag g dot">UniHealth Active</span>
              </div>
              <div className="pnl-bd">
                <div className="consent-row">
                  <span className="consent-ico"><DashIcon icon={BRAND_ICON} idPrefix="consent-treatment" /></span>
                  <div className="consent-body">
                    <div className="consent-ti">Treatment — Clinical Care</div>
                    <div className="consent-su">Allow clinicians at UniHealth-registered facilities to access your records for direct treatment.</div>
                    <div className="consent-date">Consented: 14 Jan 2024 · Required for UniHealth cover</div>
                  </div>
                  <div className="consent-right">
                    <span className="tag g"><DashIcon icon="✓" /> Granted</span>
                  </div>
                </div>
                <div className="consent-row">
                  <span className="consent-ico"><DashIcon icon="📊" /></span>
                  <div className="consent-body">
                    <div className="consent-ti">Public Health Research (Anonymised)</div>
                    <div className="consent-su">Allow anonymised data for MOH public health research. Your name and ID are never shared.</div>
                    <div className="consent-date">Last reviewed: 10 Mar 2026</div>
                  </div>
                  <div className="consent-right">
                    <span className={`tag ${researchConsent ? "g" : "am"}`}>{researchConsent ? "✓ Granted" : "✗ Withdrawn"}</span>
                    <button
                      className="btn-s"
                      style={{ fontSize: 10.5, padding: "5px 10px", marginTop: 4 }}
                      type="button"
                      disabled={consentBusy}
                      onClick={() => void toggleConsent("research", !researchConsent)}
                    >
                      {consentBusy ? "…" : researchConsent ? "Withdraw" : "Re-grant"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="pnl-hd">
                <div>
                  <div className="pnl-ti">Exercise Your Data Rights</div>
                  <div className="pnl-su">Submit a formal KDPA request</div>
                </div>
              </div>
              <div className="pnl-bd">
                <div className="ai-widget green" style={{ marginBottom: 14 }}>
                  <div className="ai-row">
                    <span className="ai-row-ico"><DashIcon icon="📥" /></span>
                    <div className="ai-row-body">
                      <div className="ai-row-ti">Download Your Health Data</div>
                      <div className="ai-row-su">Export records in FHIR R5 JSON or PDF. Right to data portability under KDPA 2019.</div>
                    </div>
                    <ExportMenu
                      label="Export Data"
                      className="btn-s btn-sm"
                      config={{
                        filename: "my-health-data-fhir",
                        printTitle: "UniHealth – My Health Data (KDPA Export)",
                        rows: [{ type: "Patient Record", format: "FHIR R5", date: new Date().toISOString().slice(0, 10), status: "Complete" }],
                      }}
                      onExported={(fmt) => toast(`KDPA data export initiated as ${fmt.toUpperCase()}.`)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                  {[
                    { ico: "✏️", lbl: "Request Rectification", detail: "Correct inaccurate or incomplete health data under Article 26(b) KDPA 2019." },
                    { ico: "🗑️", lbl: "Request Erasure", detail: "Request deletion of your health data in certain circumstances (right to be forgotten)." },
                    { ico: "📦", lbl: "Request Data Portability", detail: "Receive your health records in FHIR R5 JSON or PDF format for use with another provider." },
                    { ico: "🚫", lbl: "Object to Processing", detail: "Object to specific processing of your data (e.g. for marketing or profiling purposes)." },
                  ].map((r) => (
                    <button
                      key={r.lbl}
                      type="button"
                      className="btn-s btn-sm"
                      style={{ justifyContent: "flex-start", textAlign: "left", width: "100%" }}
                      onClick={() => {
                        void api.uiAction({ role: "patient", patient_id: patientId, label: `KDPA request: ${r.lbl}`, type: "kdpa_request" }).catch(() => {});
                        toast(`${r.lbl} request submitted. ${r.detail} The Data Protection Officer will respond within 14 working days.`);
                      }}
                    >
                      <span style={{ marginRight: 7 }}><DashIcon icon={r.ico} /></span>
                      {r.lbl}
                    </button>
                  ))}
                </div>
                <div style={{ padding: "9px 13px", background: "var(--gl)", border: "1px solid var(--gm)", borderRadius: 8, fontSize: 11, color: "var(--gd)", lineHeight: 1.6 }}>
                  <strong>Data Protection Officer:</strong> dpo@unihealth.example<br />
                  <strong>Response time:</strong> 14 working days (KDPA 2019)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Message Doctor Modal ──────────────────────────────────── */}
      {showMsgModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setShowMsgModal(false); setMsgSent(false); } }}>
          <div className="modal" style={{ maxWidth: 460, width: "95vw" }} role="dialog" aria-modal aria-label="Message Care Team">
            <div className="modal-hd">
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)" }}><DashIcon icon="💬" /> Message Care Team</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>Secure message to your assigned doctor & nurse</div>
              </div>
              <button type="button" className="sb-close" style={{ position: "static", marginLeft: "auto" }} onClick={() => { setShowMsgModal(false); setMsgSent(false); }}>✕</button>
            </div>
            {msgSent ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}><DashIcon icon="✅" /></div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "var(--g)", marginBottom: 8 }}>Message Sent!</div>
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>Your care team will respond within 24 hours. Urgent concerns: call emergency services (999) or your facility directly.</div>
                <button type="button" className="btn-s btn-sm" style={{ marginTop: 16 }} onClick={() => { setShowMsgModal(false); setMsgSent(false); }}>Close</button>
              </div>
            ) : (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "rgba(0,210,255,0.05)", border: "1px solid rgba(0,210,255,0.12)", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--t3)" }}>
                  <DashIcon icon="⚠️" /> <strong>Not for emergencies.</strong> For urgent or life-threatening concerns, call 999 or go to your nearest emergency department.
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Your message</label>
                  <textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    rows={4}
                    placeholder="Describe your question or concern clearly…"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn-s btn-sm" onClick={() => setShowMsgModal(false)}>Cancel</button>
                  <button
                    type="button"
                    className="btn-p btn-sm"
                    disabled={msgLoading || !msgText.trim()}
                    onClick={() => void sendMessage()}
                    style={{ minWidth: 110, justifyContent: "center" }}
                  >
                    {msgLoading ? "Sending…" : "Send Message"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Appointment Booking Modal ──────────────────────────────── */}
      {showBookModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowBookModal(false); }}>
          <div className="modal" style={{ maxWidth: 520, width: "95vw" }} role="dialog" aria-modal aria-label="Book Appointment">
            <div className="modal-hd">
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)" }}><DashIcon icon="📅" /> Book Appointment</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>Select facility, department, date and time</div>
              </div>
              <button type="button" className="sb-close" style={{ position: "static", marginLeft: "auto" }} onClick={() => setShowBookModal(false)}>✕</button>
            </div>

            {bookingSuccess ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}><DashIcon icon="✅" /></div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--g)", marginBottom: 6 }}>Appointment Booked!</div>
                <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6, marginBottom: 4 }}>
                  <strong>{bookingFacility}</strong> · {bookingDept}<br />
                  {bookingDate} at {bookingTime}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--t3)", marginBottom: 18 }}>{bookingSuccess}</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 16 }}>
                  Your appointment is now visible to your care team (doctor and nurse). You will receive a confirmation shortly.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button type="button" className="btn-p btn-sm" onClick={() => { setBookingSuccess(null); }}>
                    Book another
                  </button>
                  <button type="button" className="btn-s btn-sm" onClick={() => setShowBookModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Facility</label>
                    <select
                      className="form-select"
                      value={bookingFacility}
                      onChange={(e) => setBookingFacility(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12 }}
                    >
                      {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Department</label>
                    <select
                      className="form-select"
                      value={bookingDept}
                      onChange={(e) => setBookingDept(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12 }}
                    >
                      {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      min={ymd(new Date())}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Time</label>
                    <select
                      className="form-select"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12 }}
                    >
                      {(bookingSlots.length > 0 ? bookingSlots : ["08:00","09:00","10:00","11:00","14:00","15:00"]).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", display: "block", marginBottom: 5 }}>Notes (optional)</label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={2}
                    placeholder="Reason for visit, symptoms, or referral notes…"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bdr)", background: "var(--card)", color: "var(--t1)", fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ background: "rgba(0,210,255,0.06)", border: "1px solid rgba(0,210,255,0.15)", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "var(--t3)" }}>
                  ℹ️ Your appointment will be visible to your assigned doctor and nursing team at <strong>{bookingFacility}</strong>. You can cancel or reschedule up to 24 hours before the appointment.
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn-s btn-sm" onClick={() => setShowBookModal(false)}>Cancel</button>
                  <button
                    type="button"
                    className="btn-p btn-sm"
                    disabled={bookingLoading || !bookingDate || !bookingTime}
                    onClick={() => void submitBooking()}
                    style={{ minWidth: 130, justifyContent: "center" }}
                  >
                    {bookingLoading ? "Booking…" : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
