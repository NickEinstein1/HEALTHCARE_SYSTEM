import type { RoleKey } from "../theme/tokens";

export type RoleConfig = {
  ico: string;
  title: string;
  sub: string;
  note: string;
  noteClass: "grn" | "blu" | "amb";
  noteIco: string;
  regLbl?: string;
  regHint?: string;
  regPH?: string;
  regRx?: RegExp;
  regErr?: string;
  staffNote?: string;
  successRole: string;
  successMsg: string;
};

export const ROLE_CONFIG: Record<RoleKey, RoleConfig> = {
  doctor: {
    ico: "🩺",
    title: "Sign in as Doctor",
    sub: "Registration number + institutional email + password",
    note:
      "Enter your <strong>Medical Registration Number</strong>, institutional email and password, then confirm via SMS or email OTP.",
    noteClass: "grn",
    noteIco: "🏥",
    regLbl: "Medical Registration No.",
    regHint: "e.g. A4821 or M/12345 — as on your medical licence",
    regPH: "e.g. A4821",
    regRx: /^[A-Za-z0-9/\-]{3,12}$/,
    regErr: "Enter your registration number as printed on your licence.",
    staffNote: "Registration number + institutional email + password → SMS/email OTP",
    successRole: "Doctor — Pilot Hospital A",
    successMsg: "Identity verified.\nRedirecting to clinical dashboard…",
  },
  nurse: {
    ico: "💉",
    title: "Sign in as Nurse / Clinical Officer",
    sub: "Registration number + institutional email + password",
    note:
      "Enter your <strong>Nursing Registration Number</strong>, institutional email and password, then confirm via SMS or email OTP.",
    noteClass: "grn",
    noteIco: "🏥",
    regLbl: "Nursing Registration No.",
    regHint: "e.g. RN/12345 or CO/7890 — from your nursing certificate",
    regPH: "e.g. RN/12345",
    regRx: /^[A-Za-z0-9/\-]{5,15}$/,
    regErr: "Enter your nursing registration number.",
    staffNote: "Registration number + institutional email + password → SMS/email OTP",
    successRole: "Nurse — Pilot Hospital B",
    successMsg: "Identity verified.\nRedirecting to nursing portal…",
  },
  admin: {
    ico: "🗂️",
    title: "Sign in as Administrator",
    sub: "Employee ID + institutional email + password",
    note:
      "Enter your <strong>Employee ID</strong>, institutional email and password, then confirm via SMS or email OTP.",
    noteClass: "grn",
    noteIco: "🔐",
    regLbl: "HRIS Employee ID",
    regHint: "e.g. ADMIN-KE-00441 — from your organization HR system",
    regPH: "e.g. ADMIN-KE-00441",
    regRx: /^[A-Za-z0-9\-]{4,20}$/,
    regErr: "Enter your HRIS Employee ID (e.g. ADMIN-KE-00441).",
    staffNote: "Employee ID + institutional email + password → SMS/email OTP",
    successRole: "Administrator — UniHealth Pilot",
    successMsg: "HRIS identity verified.\nRedirecting to admin dashboard…",
  },
  patient: {
    ico: "🙋",
    title: "Access Your Health Records",
    sub: "UniHealth Patient Portal: ID type → ID number + 4-digit PIN → OTP / Biometric",
    note:
      "<strong>UniHealth Patient Portal login.</strong> Select your ID type, enter your ID number and the <strong>4-digit PIN</strong> you created during UniHealth registration, then verify via SMS OTP or fingerprint biometric.",
    noteClass: "blu",
    noteIco: "🏛️",
    successRole: "Patient — UniHealth Self-Service",
    successMsg: "UniHealth identity verified.\nRedirecting to your health records…",
  },
  lab: {
    ico: "🧫",
    title: "Sign in to Laboratory Portal",
    sub: "Lab staff ID + institutional email + password",
    note:
      "Enter your <strong>Laboratory Staff ID</strong>, institutional email and password, then confirm via email OTP.",
    noteClass: "amb",
    noteIco: "🧪",
    regLbl: "Laboratory Staff ID",
    regHint: "e.g. LAB-KE-00231 — as issued by your facility",
    regPH: "e.g. LAB-KE-00231",
    regRx: /^[A-Za-z0-9\-]{5,20}$/,
    regErr: "Enter your lab staff ID (e.g. LAB-KE-00231).",
    staffNote: "Staff ID + institutional email + password → email OTP",
    successRole: "Laboratory — Diagnostic Services",
    successMsg: "Identity verified.\nRedirecting to laboratory portal…",
  },
  pharmacy: {
    ico: "💊",
    title: "Sign in to Pharmacy Portal",
    sub: "Pharmacist ID + institutional email + password",
    note:
      "Enter your <strong>Pharmacy Registration ID</strong>, institutional email and password, then confirm via email OTP.",
    noteClass: "amb",
    noteIco: "🏥",
    regLbl: "Pharmacy Registration ID",
    regHint: "e.g. PHARM-00441 — as on your licence / facility roster",
    regPH: "e.g. PHARM-00441",
    regRx: /^[A-Za-z0-9/\-]{5,20}$/,
    regErr: "Enter your pharmacy registration ID (e.g. PHARM-00441).",
    staffNote: "Registration ID + institutional email + password → email OTP",
    successRole: "Pharmacy — Clinical Dispensing",
    successMsg: "Identity verified.\nRedirecting to pharmacy portal…",
  },
};

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
