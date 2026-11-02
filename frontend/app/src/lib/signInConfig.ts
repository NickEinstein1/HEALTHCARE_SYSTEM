import type { RoleKey } from "../theme/tokens";
import { BRAND_ICON } from "../components/brand/brandIcon";

export type RoleConfig = {
  ico: string;
  title: string;
  sub: string;
  noteHead: string;
  noteBody: string;
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
    ico: "role.doctor",
    title: "Sign in as Doctor",
    sub: "Medical Registration No. · Institutional Email · Password",
    noteHead: "Medical Registration No. · email · password",
    noteBody: "Confirm identity via SMS or email OTP after sign-in.",
    noteClass: "grn",
    noteIco: BRAND_ICON,
    regLbl: "Medical Registration No.",
    regHint: "e.g. A4821 or M/12345 — as on your medical licence",
    regPH: "e.g. A4821",
    regRx: /^[A-Za-z0-9/\-]{3,12}$/,
    regErr: "Enter your registration number as printed on your licence.",
    staffNote: "Reg. No. · Email · Password → OTP",
    successRole: "Doctor — Pilot Hospital A",
    successMsg: "Identity verified.\nRedirecting to clinical dashboard…",
  },
  nurse: {
    ico: "role.nurse",
    title: "Sign in as Nurse / Clinical Officer",
    sub: "Nursing Registration No. · Institutional Email · Password",
    noteHead: "Nursing Registration No. · email · password",
    noteBody: "Confirm identity via SMS or email OTP after sign-in.",
    noteClass: "grn",
    noteIco: BRAND_ICON,
    regLbl: "Nursing Registration No.",
    regHint: "e.g. RN/12345 or CO/7890 — from your nursing certificate",
    regPH: "e.g. RN/12345",
    regRx: /^[A-Za-z0-9/\-]{5,15}$/,
    regErr: "Enter your nursing registration number.",
    staffNote: "Reg. No. · Email · Password → OTP",
    successRole: "Nurse — Pilot Hospital B",
    successMsg: "Identity verified.\nRedirecting to nursing portal…",
  },
  admin: {
    ico: "role.admin",
    title: "Sign in as Administrator",
    sub: "HRIS Employee ID · Institutional Email · Password",
    noteHead: "HRIS Employee ID · email · password",
    noteBody: "Confirm identity via SMS or email OTP after sign-in.",
    noteClass: "grn",
    noteIco: "🔐",
    regLbl: "HRIS Employee ID",
    regHint: "e.g. ADMIN-KE-00441 — from your organization HR system",
    regPH: "e.g. ADMIN-KE-00441",
    regRx: /^[A-Za-z0-9\-]{4,20}$/,
    regErr: "Enter your HRIS Employee ID (e.g. ADMIN-KE-00441).",
    staffNote: "Employee ID · Email · Password → OTP",
    successRole: "Administrator — UniHealth Pilot",
    successMsg: "HRIS identity verified.\nRedirecting to admin dashboard…",
  },
  patient: {
    ico: "role.patient",
    title: "Access Your Health Records",
    sub: "ID type · ID number · 4-digit PIN → OTP or Biometric",
    noteHead: "National / Passport / Alien ID · 4-digit UniHealth PIN",
    noteBody: "Verify via SMS OTP or fingerprint biometric.",
    noteClass: "blu",
    noteIco: "🏛️",
    successRole: "Patient — UniHealth Self-Service",
    successMsg: "UniHealth identity verified.\nRedirecting to your health records…",
  },
  lab: {
    ico: "role.lab",
    title: "Sign in to Laboratory Portal",
    sub: "Lab Staff ID · Institutional Email · Password",
    noteHead: "Laboratory Staff ID · email · password",
    noteBody: "Confirm identity via email OTP after sign-in.",
    noteClass: "amb",
    noteIco: "🧪",
    regLbl: "Laboratory Staff ID",
    regHint: "e.g. LAB-KE-00231 — as issued by your facility",
    regPH: "e.g. LAB-KE-00231",
    regRx: /^[A-Za-z0-9\-]{5,20}$/,
    regErr: "Enter your lab staff ID (e.g. LAB-KE-00231).",
    staffNote: "Staff ID · Email · Password → OTP",
    successRole: "Laboratory — Diagnostic Services",
    successMsg: "Identity verified.\nRedirecting to laboratory portal…",
  },
  pharmacy: {
    ico: "role.pharmacy",
    title: "Sign in to Pharmacy Portal",
    sub: "Pharmacy Registration ID · Institutional Email · Password",
    noteHead: "Pharmacy Registration ID · email · password",
    noteBody: "Confirm identity via email OTP after sign-in.",
    noteClass: "amb",
    noteIco: BRAND_ICON,
    regLbl: "Pharmacy Registration ID",
    regHint: "e.g. PHARM-00441 — as on your licence / facility roster",
    regPH: "e.g. PHARM-00441",
    regRx: /^[A-Za-z0-9/\-]{5,20}$/,
    regErr: "Enter your pharmacy registration ID (e.g. PHARM-00441).",
    staffNote: "Registration ID · Email · Password → OTP",
    successRole: "Pharmacy — Clinical Dispensing",
    successMsg: "Identity verified.\nRedirecting to pharmacy portal…",
  },
  billing: {
    ico: "role.billing",
    title: "Sign in to Billing & Finance",
    sub: "Finance Staff ID · Institutional Email · Password",
    noteHead: "Finance Staff ID · email · password",
    noteBody: "Confirm identity via email OTP after sign-in.",
    noteClass: "amb",
    noteIco: "💳",
    regLbl: "Finance Staff ID",
    regHint: "e.g. FIN-00441 — as issued by your facility finance office",
    regPH: "e.g. FIN-00441",
    regRx: /^[A-Za-z0-9\-]{5,20}$/,
    regErr: "Enter your finance staff ID (e.g. FIN-00441).",
    staffNote: "Staff ID · Email · Password → OTP",
    successRole: "Billing — Financial Management",
    successMsg: "Identity verified.\nRedirecting to billing dashboard…",
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
