// WFD App — Domain data, constants, and lookup tables

const DOMAIN_LABELS = {
  d1: 'Patient Assessment',
  d2: 'Clinical Management',
  d3: 'Motor Skills',
  d4: 'Time Pressure',
  d5: 'CRM'
};

const DOMAIN_CRITICAL = { d1: false, d2: true, d3: true, d4: false, d5: false };

const DEMAND_DESCRIPTORS = {
  d1: ['Straightforward','Low Complexity','Moderate Complexity','High Complexity','Diagnostically Demanding'],
  d2: ['Protocol-Straightforward','Low Decision Load','Moderate Decision Load','High Decision Load','Maximum Clinical Complexity'],
  d3: ['Foundational Only','Routine Procedures','Moderately Demanding','Technically Demanding','Maximum Technical Demand'],
  d4: ['Minimal','Low','Moderate','High','Extreme'],
  d5: ['Minimal Coordination','Low Coordination','Moderate Coordination','High Coordination','Maximum Coordination']
};

const CAP_DESCRIPTORS = {
  d1: ['Unsafe / Incomplete','Fragmented','Adequate','Strong','Expert'],
  d2: ['Unsafe','Hesitant / Inefficient','Appropriate','Confident & Adaptive','High-Level Clinical Control'],
  d3: ['Unsafe','Inconsistent','Competent','Proficient','High-Stakes Mastery'],
  d5: ['Dysfunctional','Limited','Functional','Strong','Exemplary']
};

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

const CANDIDATE_GROUP_LABELS = {
  'paramedic_cadet':   'Probationary Paramedic',
  'paramedic_on_hire': 'Paramedic-On-Hire'
};

const CONFERENCE_TYPES = [
  { value: 'initial_alignment',       label: 'Initial Alignment' },
  { value: 'midpoint_calibration',    label: 'Midpoint Calibration' },
  { value: 'pre_capstone_readiness',  label: 'Pre-Capstone Readiness' }
];

const CAPSTONE_ELEMENTS = [
  { key: 'includes_cpr',              label: 'High-performance CPR' },
  { key: 'includes_lp35',             label: 'LP35 use' },
  { key: 'includes_ett',              label: 'Advanced Airway (ETT) placement' },
  { key: 'includes_dynamic_cardiology', label: 'Dynamic cardiology' },
  { key: 'includes_acls_pharm',       label: 'ACLS pharmacology' },
  { key: 'includes_post_rosc',        label: 'Post-ROSC management' },
  { key: 'includes_push_epi',         label: 'Push-dose epinephrine' },
  { key: 'includes_monitoring',       label: 'Continuous monitoring (SpO2, EtCO2, BP, ECG)' }
];

const CAPSTONE_CHECKS = [
  { key: 'check_rhythm_recognition',      label: 'Early recognition of presenting rhythm and appropriate intervention' },
  { key: 'check_compression_fraction',    label: 'Compression fraction > 90%' },
  { key: 'check_no_long_pause',           label: 'No compression pause > 10 seconds' },
  { key: 'check_airway_management',       label: 'Successful advanced airway management' },
  { key: 'check_crm',                     label: 'Effective CRM throughout' },
  { key: 'check_no_safety_intervention',  label: 'No FTI intervention required for patient safety' }
];
