import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BillingPatientSummary } from "../lib/api";

export function useBillingSummary(patientId: string) {
  const [billing, setBilling] = useState<BillingPatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.billingPatientSummary(patientId);
      setBilling(data);
    } catch {
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const payWithMpesa = useCallback(async (purpose: string, amountKes?: number, invoiceId?: string) => {
    if (payBusy) return null;
    setPayBusy(true);
    try {
      const res = await api.patientPayment({
        patient_id: patientId,
        purpose,
        amount_kes: amountKes,
        invoice_id: invoiceId,
      });
      await refresh();
      return res;
    } finally {
      setPayBusy(false);
    }
  }, [patientId, payBusy, refresh]);

  return { billing, loading, payBusy, refresh, payWithMpesa };
}
