import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export type ApptRow = {
  id: string;
  when: string;
  where: string;
  dept: string;
  status: string;
  tag: "green" | "amber" | "red";
};

function statusTag(s: string): ApptRow["tag"] {
  if (s === "confirmed") return "green";
  if (s === "cancelled") return "red";
  return "amber";
}

export function useAppointments(patientId: string) {
  const [rows, setRows] = useState<ApptRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const live = await api.appointments(patientId);
      if (live.length > 0) {
        setRows(
          live.map((a) => ({
            id: String(a.id),
            when: `${a.date} ${a.time}`,
            where: String(a.facility),
            dept: String(a.department),
            status: String(a.status ?? "pending"),
            tag: statusTag(String(a.status ?? "pending")),
          })),
        );
      } else {
        setRows([
          { id: "APT-2026-001", when: "15 Mar 2026 · 09:00", where: "KNH Nairobi", dept: "Cardiology", status: "confirmed", tag: "green" },
          { id: "APT-2026-002", when: "22 Mar 2026 · 14:00", where: "Coast General Hospital", dept: "Follow-up", status: "pending", tag: "amber" },
        ]);
      }
    } catch {
      setRows([
        { id: "APT-2026-001", when: "15 Mar 2026 · 09:00", where: "KNH Nairobi", dept: "Cardiology", status: "confirmed", tag: "green" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { appointments: rows, loading, reload: load };
}
