export const PATIENT_ROLE = {
  ico: "🙋",
  title: "Access Your Health Records",
  sub: "ID type · ID number · 4-digit PIN → OTP or Biometric",
  noteHead: "National / Passport / Alien ID · 4-digit UniHealth PIN",
  noteBody: "Verify via SMS OTP or fingerprint biometric.",
  successRole: "Patient — UniHealth Self-Service",
  successMsg: "UniHealth identity verified.\nRedirecting to your health records…",
} as const;

export type IdTypeKey = "national" | "passport" | "alien" | "refugee" | "mandate" | "temp";

export type IdTypeConfig = {
  lbl: string;
  ph: string;
  hint: string;
  rx: RegExp;
  err: string;
};

export const ID_TYPES: Record<IdTypeKey, IdTypeConfig> = {
  national: {
    lbl: "National ID Number",
    ph: "e.g. 12345678",
    hint: "7 or 8-digit number as on your National ID card",
    rx: /^\d{7,8}$/,
    err: "Enter your 7 or 8-digit national ID number.",
  },
  passport: {
    lbl: "Passport Number",
    ph: "e.g. A1234567",
    hint: "As printed on the data page of your passport",
    rx: /^[A-Z0-9]{6,12}$/i,
    err: "Enter a valid passport number.",
  },
  alien: {
    lbl: "Alien ID Number",
    ph: "e.g. 2012345678",
    hint: "As printed on your Foreign Resident ID card",
    rx: /^[A-Z0-9\-]{5,15}$/i,
    err: "Enter your Alien ID number.",
  },
  refugee: {
    lbl: "Refugee ID Number",
    ph: "e.g. REF/2023/0001",
    hint: "UNHCR-issued Refugee ID number",
    rx: /^[A-Z0-9/\-]{5,20}$/i,
    err: "Enter your Refugee ID number.",
  },
  mandate: {
    lbl: "Mandate Number",
    ph: "e.g. MND-2024-00123",
    hint: "UniHealth Mandate Number",
    rx: /^[A-Z0-9\-]{5,20}$/i,
    err: "Enter your UniHealth Mandate Number.",
  },
  temp: {
    lbl: "Temporary ID Number",
    ph: "e.g. TMP-2024-00001",
    hint: "Temporary ID number",
    rx: /^[A-Z0-9\-]{5,20}$/i,
    err: "Enter your Temporary ID number.",
  },
};

export const ID_TYPE_OPTIONS: { value: IdTypeKey; label: string }[] = [
  { value: "national", label: "National / Citizen ID" },
  { value: "passport", label: "Passport" },
  { value: "alien", label: "Foreign Resident (Alien ID)" },
  { value: "refugee", label: "Refugee ID" },
  { value: "mandate", label: "Mandate Number" },
  { value: "temp", label: "Temporary ID" },
];

export const PHONE_RX = /^(\+2547|\+2541|07|01)\d{8,9}$/;

export const FACILITIES = [
  "Kenyatta National Hospital",
  "Aga Khan University Hospital",
  "Moi Teaching & Referral Hospital",
  "Pumwani Maternity Hospital",
  "Coast General Hospital",
  "Other",
];

export const PATIENT_STEPS = [
  { n: "01", title: "Register Once", body: "Sign up with your National ID. Your profile links to NHIF / SHA coverage.", color: "#3d8ef8" },
  { n: "02", title: "Book & Arrive", body: "Pick a slot at any linked facility. Walk in with your record ready.", color: "#00e5a0" },
  { n: "03", title: "Get Care", body: "Your doctor sees your history, orders labs, and writes prescriptions.", color: "#00d4ff" },
  { n: "04", title: "Stay Informed", body: "Track medications, results, and appointments in Patient 360.", color: "#a855f7" },
];
