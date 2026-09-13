export type MedicalProviderType = "doctor" | "clinic" | "hospital" | "laboratory";

export type MedicalProvider = {
  id: string;
  type: MedicalProviderType;
  name: string;
  qualifications?: string[];
  specialty?: string;
  subSpecialty?: string;
  registrationNumber?: string;
  registrationCouncil?: string;
  verificationSource?: string;
  verificationStatus: "verified" | "pending" | "unverified";
  city?: string;
  district?: string;
  state?: string;
  address?: string;
  phone?: string;
  appointmentUrl?: string;
  emergency?: boolean;
  services?: string[];
};

export const MEDICAL_SPECIALTIES = [
  "General Medicine",
  "Family Medicine",
  "Emergency Medicine",
  "Cardiology",
  "Endocrinology",
  "Gastroenterology",
  "Nephrology",
  "Neurology",
  "Neurosurgery",
  "Pulmonology / Respiratory Medicine",
  "Dermatology",
  "Paediatrics",
  "Obstetrics & Gynaecology",
  "Orthopaedics",
  "Ophthalmology",
  "Otorhinolaryngology (ENT)",
  "Psychiatry",
  "Urology",
  "Medical Oncology",
  "Surgical Oncology",
  "Radiation Oncology",
  "Clinical Haematology",
  "Infectious Diseases",
  "Rheumatology",
  "Pathology",
  "Radiology",
  "Anaesthesiology",
  "Dentistry",
] as const;

export const MEDICAL_CONDITION_MAP: Record<string, string[]> = {
  cardiology: ["chest pain", "heart pain", "palpitations", "irregular heartbeat", "heart failure", "angina", "coronary", "blood pressure", "hypertension"],
  endocrinology: ["diabetes", "diabetic", "high sugar", "glucose", "thyroid", "tsh", "t3", "t4", "hormone", "pcos", "metabolic"],
  gastroenterology: ["stomach", "abdomen", "abdominal", "gastric", "acidity", "ulcer", "gerd", "reflux", "liver", "hepatitis", "jaundice", "intestine", "bowel"],
  nephrology: ["kidney", "creatinine", "protein in urine", "kidney stone", "renal", "dialysis", "swelling with kidney"],
  neurology: ["migraine", "seizure", "epilepsy", "stroke", "tremor", "neuropathy", "numbness", "weakness", "vertigo", "memory loss", "headache"],
  pulmonology: ["asthma", "breathing", "breathlessness", "shortness of breath", "copd", "lung", "pneumonia", "persistent cough", "sleep apnea"],
  dermatology: ["skin", "rash", "acne", "eczema", "psoriasis", "itching", "hair loss", "fungal infection", "nail"],
  paediatrics: ["child", "baby", "infant", "newborn", "kid fever", "pediatric", "paediatric"],
  obgyn: ["pregnancy", "pregnant", "period", "menstrual", "pcos", "fertility", "ovarian", "uterus", "gynecology", "gynaecology"],
  orthopaedics: ["bone", "joint", "fracture", "arthritis", "knee pain", "back pain", "spine", "shoulder pain", "sports injury"],
  ophthalmology: ["eye", "vision", "blurred vision", "cataract", "glaucoma", "retina"],
  ent: ["ear", "hearing", "nose", "sinus", "throat", "tonsil", "ent"],
  psychiatry: ["depression", "anxiety", "panic", "bipolar", "schizophrenia", "mental health", "suicidal thoughts", "insomnia"],
  urology: ["urine", "urinary", "prostate", "erectile", "bladder", "blood in urine", "kidney stone"],
  oncology: ["cancer", "tumor", "chemotherapy", "radiotherapy", "oncology"],
  haematology: ["anemia", "anaemia", "low hemoglobin", "platelet", "white blood cell", "blood disorder", "clotting"],
  infectious_disease: ["infection", "dengue", "malaria", "tb", "tuberculosis", "typhoid", "hiv"],
  rheumatology: ["rheumatoid", "lupus", "autoimmune", "joint swelling", "gout"],
};

// Provider records are intentionally empty until populated from an authoritative
// source or a provider-submitted/verified record. Never fabricate doctors,
// qualifications, registration numbers, clinics, hospitals or laboratories.
export const MEDICAL_PROVIDERS: MedicalProvider[] = [];

export function detectMedicalSpecialties(query: string): string[] {
  const q = query.toLowerCase();
  const matches: string[] = [];
  const add = (specialty: string) => { if (!matches.includes(specialty)) matches.push(specialty); };

  for (const [key, terms] of Object.entries(MEDICAL_CONDITION_MAP)) {
    if (terms.some(term => q.includes(term))) {
      if (key === "cardiology") add("Cardiology");
      if (key === "endocrinology") add("Endocrinology");
      if (key === "gastroenterology") add("Gastroenterology");
      if (key === "nephrology") add("Nephrology");
      if (key === "neurology") add("Neurology");
      if (key === "pulmonology") add("Pulmonology / Respiratory Medicine");
      if (key === "dermatology") add("Dermatology");
      if (key === "paediatrics") add("Paediatrics");
      if (key === "obgyn") add("Obstetrics & Gynaecology");
      if (key === "orthopaedics") add("Orthopaedics");
      if (key === "ophthalmology") add("Ophthalmology");
      if (key === "ent") add("Otorhinolaryngology (ENT)");
      if (key === "psychiatry") add("Psychiatry");
      if (key === "urology") add("Urology");
      if (key === "oncology") add("Medical Oncology");
      if (key === "haematology") add("Clinical Haematology");
      if (key === "infectious_disease") add("Infectious Diseases");
      if (key === "rheumatology") add("Rheumatology");
    }
  }

  if (/(emergency|unconscious|fainted|severe chest pain|difficulty breathing|cannot breathe|heavy bleeding|stroke symptoms)/i.test(q)) {
    add("Emergency Medicine");
  }
  if (matches.length === 0 && /(doctor|medical|medicine|symptom|disease|diagnosis|treatment|report|lab|test|hospital|clinic)/i.test(q)) {
    add("General Medicine");
  }
  return matches.slice(0, 4);
}

export function isMedicalQuery(query: string): boolean {
  return detectMedicalSpecialties(query).length > 0 || /(doctor|medical|medicine|symptom|disease|diagnosis|treatment|medication|tablet|capsule|prescription|blood test|lab report|hospital|clinic)/i.test(query);
}

export function recommendMedicalProviders(query: string, location?: string, type?: MedicalProviderType): { specialties: string[]; providers: MedicalProvider[]; sourcePolicy: string } {
  const specialties = detectMedicalSpecialties(query);
  const wantedLocation = (location || "").toLowerCase();
  const providers = MEDICAL_PROVIDERS
    .filter(p => !type || p.type === type)
    .filter(p => p.verificationStatus === "verified")
    .filter(p => specialties.length === 0 || !p.specialty || specialties.includes(p.specialty))
    .filter(p => !wantedLocation || `${p.city || ""} ${p.district || ""} ${p.state || ""} ${p.address || ""}`.toLowerCase().includes(wantedLocation))
    .slice(0, 20);

  return {
    specialties,
    providers,
    sourcePolicy: "Only verified provider records from authoritative or provider-submitted sources should be displayed; no provider is fabricated by Nexa AI.",
  };
}
