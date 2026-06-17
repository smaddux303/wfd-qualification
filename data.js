// WFD App — Domain data, constants, and lookup tables
// Updated per WFD Paramedic Qualification Manual v10.1
//
// APP VERSION HISTORY:
// v1.0.0 — Initial build: DCA form, candidates, gaps, radar chart, phase log,
//          SAM conferences, capstone, admin panel
// v1.1.0 — Manual v10.1 update: Domain 4 Cadence capability, capstone elements
//          simplified, two-extension structure, SOG→Directive, NREMT section
// v1.2.0 — User feedback round: hours logging, stability fixes, color swap,
//          ePCR repositioning, anonymization system (code + alias), auto-save
// v1.3.0 — FTI column on DCA history, ePCR required on gap, acting SAM Officer
//          flag, last-name sorting throughout, version indicator added
// v1.3.1 — Replaced full_name parsing with explicit first_name/last_name
//          fields to correctly handle compound surnames (e.g. "Van Marter")
// v1.4.0 — Capstone renamed to Independent Practice Evaluation (IPE).
//          Section 3.7 exit documentation check required before a candidate
//          can be marked Qualified. Confirmation step added to prevent
//          accidental qualification. New Program History view for qualified
//          candidates, with full-record export and admin-only reversal.

const DOMAIN_LABELS = {
  d1: 'Patient Assessment',
  d2: 'Clinical Management',
  d3: 'Motor Skills',
  d4: 'Time Pressure / Cadence',
  d5: 'CRM'
};

const DOMAIN_CRITICAL = { d1: false, d2: true, d3: true, d4: false, d5: false };

// Domain 4 now has BOTH demand and capability scales (v10.1 change)
const DEMAND_DESCRIPTORS = {
  d1: ['Straightforward','Low Complexity','Moderate Complexity','High Complexity','Diagnostically Demanding'],
  d2: ['Protocol-Straightforward','Low Decision Load','Moderate Decision Load','High Decision Load','Maximum Clinical Complexity'],
  d3: ['Foundational Only','Routine Procedures','Moderately Demanding','Technically Demanding','Maximum Technical Demand'],
  d4: ['Minimal','Low','Moderate','High','Extreme'],
  d5: ['Minimal Coordination','Low Coordination','Moderate Coordination','High Coordination','Maximum Coordination']
};

// Domain 4 Cadence capability descriptors added in v10.1
// Note: higher score = better calibration, NOT necessarily faster pace
const CAP_DESCRIPTORS = {
  d1: ['Unsafe / Incomplete','Fragmented','Adequate','Strong','Expert'],
  d2: ['Unsafe','Hesitant / Inefficient','Appropriate','Confident & Adaptive','High-Level Clinical Control'],
  d3: ['Unsafe','Inconsistent','Competent','Proficient','High-Stakes Mastery'],
  d4: ['Inappropriate','Poorly Calibrated','Partially Calibrated','Well Calibrated','Appropriate'],
  d5: ['Dysfunctional','Limited','Functional','Strong','Exemplary']
};

// Domain 4 cadence notes for FTI guidance
const D4_CADENCE_NOTE = 'A high score reflects pace appropriately matched to demand — not necessarily fast. ' +
  'A gap exists when the call required more urgency than the Candidate demonstrated. ' +
  'Over-urgency on a low-demand call is a calibration concern but does not create a formal gap — capture it in narrative.';

const TRIGGERS = [
  { value: 'red_call',              label: 'Red (high-acuity) call' },
  { value: 'safety_intervention',   label: 'Safety-driven FTI intervention' },
  { value: 'phase_transition',      label: 'Phase transition under consideration' },
  { value: 'unexpected_complexity', label: 'Unexpected call complexity' },
  { value: 'fti_discretion',        label: 'FTI discretion' }
];

const CLOSURE_PATHWAYS = [
  { value: 'natural_field_exposure',    label: 'Natural field exposure' },
  { value: 'instructor_observed_proxy', label: 'Instructor-observed proxy behavior' },
  { value: 'structured_simulation',     label: 'Structured simulation / focused skill evaluation' }
];

const PHASES = ['I','II','III','IV'];

// Change #16 — restored to Paramedic Cadet
const CANDIDATE_GROUP_LABELS = {
  'paramedic_cadet':   'Paramedic Cadet',
  'paramedic_on_hire': 'Paramedic-On-Hire'
};

const CONFERENCE_TYPES = [
  { value: 'initial_alignment',      label: 'Initial Alignment' },
  { value: 'midpoint_calibration',   label: 'Midpoint Calibration' },
  { value: 'pre_capstone_readiness', label: 'Pre-Capstone Readiness' }
];

// Change #2 — push-dose epi and monitoring removed per v10.1
const CAPSTONE_ELEMENTS = [
  { key: 'includes_cpr',                label: 'High-performance CPR' },
  { key: 'includes_lp35',               label: 'LP35 use' },
  { key: 'includes_ett',                label: 'Advanced Airway (ETT) placement' },
  { key: 'includes_dynamic_cardiology', label: 'Dynamic cardiology' },
  { key: 'includes_acls_pharm',         label: 'ACLS pharmacology' },
  { key: 'includes_post_rosc',          label: 'Post-ROSC management' }
];

const CAPSTONE_CHECKS = [
  { key: 'check_rhythm_recognition',     label: 'Early recognition of presenting rhythm and appropriate intervention' },
  { key: 'check_compression_fraction',   label: 'Compression fraction > 90%' },
  { key: 'check_no_long_pause',          label: 'No compression pause > 10 seconds' },
  { key: 'check_airway_management',      label: 'Successful advanced airway management' },
  { key: 'check_crm',                    label: 'Effective CRM throughout' },
  { key: 'check_no_safety_intervention', label: 'No FTI intervention required for patient safety' }
];

// Change #11 — unified manager check (SAM Officer and Admin have identical rights)
// Updated — also grants manager rights to FTIs flagged as acting SAM Officers
function isManager() {
  if (['sam_officer','admin'].includes(currentProfile?.role)) return true;
  if (currentProfile?.role === 'fti' && currentProfile?.acting_sam === true) return true;
  return false;
}

// Phase labels for display
const PHASE_LABELS = {
  'I':   'Phase I — Orientation and Observation',
  'II':  'Phase II — Guided Practice',
  'III': 'Phase III — Supervised Leadership',
  'IV':  'Phase IV — Capstone'
};
