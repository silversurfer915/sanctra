import type {
  JeeSyllabus,
  JeeTrackState,
  JeeAiInsightsResult,
  JeeAiInsightItem,
} from "../types/jeetrack.ts";

export const CANONICAL_JEE_SYLLABUS: JeeSyllabus = {
  "physics": [
    {
      "id": 101,
      "name": "Units and Measurements",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 102,
      "name": "Mathematical Tools",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 103,
      "name": "Motion in 1 Dimension",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 104,
      "name": "Motion in 2 Dimension",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 105,
      "name": "Laws of Motion",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 106,
      "name": "Work Power Energy",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 107,
      "name": "Center of Mass & Collision",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 108,
      "name": "Rotational Motion",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 109,
      "name": "Gravitation",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 1"
    },
    {
      "id": 110,
      "name": "Mechanical Properties of Solids",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 2"
    },
    {
      "id": 111,
      "name": "Mechanical Properties of Fluids",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 2"
    },
    {
      "id": 112,
      "name": "Oscillations",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 2"
    },
    {
      "id": 113,
      "name": "Waves and Sound",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Mechanics 2"
    },
    {
      "id": 114,
      "name": "Thermal Properties of Matter",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Thermodynamics"
    },
    {
      "id": 115,
      "name": "Thermodynamics",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Thermodynamics"
    },
    {
      "id": 116,
      "name": "Kinetic Theory of Gases",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Thermodynamics"
    },
    {
      "id": 117,
      "name": "Electric Charges and Fields",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 118,
      "name": "Electrostatic Potential and Capacitance",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 119,
      "name": "Current Electricity",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 120,
      "name": "Moving Charges and Magnetism",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 121,
      "name": "Magnetism and Matter",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 122,
      "name": "Electromagnetic Induction",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 123,
      "name": "Alternating Current",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Electromagnetism"
    },
    {
      "id": 124,
      "name": "Ray Optics",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Optics"
    },
    {
      "id": 125,
      "name": "Wave Optics",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Optics"
    },
    {
      "id": 126,
      "name": "Dual Nature of Matter",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Modern Physics"
    },
    {
      "id": 127,
      "name": "Atomic Physics",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Modern Physics"
    },
    {
      "id": 128,
      "name": "Nuclear Physics",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Modern Physics"
    },
    {
      "id": 129,
      "name": "Electromagnetic Waves",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Miscellaneous Physics"
    },
    {
      "id": 130,
      "name": "Semiconductor",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Miscellaneous Physics"
    }
  ],
  "chemistry": [
    {
      "id": 201,
      "name": "Some Basic Concepts of Chemistry",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "11",
      "unit": "Physical Chemistry"
    },
    {
      "id": 202,
      "name": "Structure of Atom",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "11",
      "unit": "Physical Chemistry"
    },
    {
      "id": 203,
      "name": "Thermodynamics",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "11",
      "unit": "Physical Chemistry"
    },
    {
      "id": 204,
      "name": "Chemical Equilibrium",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "11",
      "unit": "Physical Chemistry"
    },
    {
      "id": 205,
      "name": "Ionic Equilibrium",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "11",
      "unit": "Physical Chemistry"
    },
    {
      "id": 206,
      "name": "Redox Reactions",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "11",
      "unit": "Physical Chemistry"
    },
    {
      "id": 207,
      "name": "Classification of Elements",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "11",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 208,
      "name": "Chemical Bonding and Molecular Structure",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "11",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 209,
      "name": "p Block Elements",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "11",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 210,
      "name": "Hydrogen",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "11",
      "unit": "Inorganic Chemistry",
      "adv": true
    },
    {
      "id": 211,
      "name": "s Block Elements",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "11",
      "unit": "Inorganic Chemistry",
      "adv": true
    },
    {
      "id": 212,
      "name": "General Organic Chemistry",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "11",
      "unit": "Organic Chemistry"
    },
    {
      "id": 213,
      "name": "Hydrocarbons",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "11",
      "unit": "Organic Chemistry"
    },
    {
      "id": 214,
      "name": "Solutions",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "12",
      "unit": "Physical Chemistry"
    },
    {
      "id": 215,
      "name": "Electrochemistry",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "12",
      "unit": "Physical Chemistry"
    },
    {
      "id": 216,
      "name": "Chemical Kinetics",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "12",
      "unit": "Physical Chemistry"
    },
    {
      "id": 217,
      "name": "Surface Chemistry",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "12",
      "unit": "Physical Chemistry",
      "adv": true
    },
    {
      "id": 218,
      "name": "Solid State",
      "theory": false,
      "practice": false,
      "section": "physical",
      "class": "12",
      "unit": "Physical Chemistry",
      "adv": true
    },
    {
      "id": 219,
      "name": "d and f Block Elements",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "12",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 220,
      "name": "Coordination Compounds",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "12",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 221,
      "name": "p Block Elements (12th)",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "12",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 222,
      "name": "Practical Chemistry",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "12",
      "unit": "Inorganic Chemistry"
    },
    {
      "id": 223,
      "name": "General Principles & Isolation of Metals",
      "theory": false,
      "practice": false,
      "section": "inorganic",
      "class": "12",
      "unit": "Inorganic Chemistry",
      "adv": true
    },
    {
      "id": 224,
      "name": "Haloalkanes and Haloarenes",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry"
    },
    {
      "id": 225,
      "name": "Alcohols Phenols and Ethers",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry"
    },
    {
      "id": 226,
      "name": "Aldehydes Ketones",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry"
    },
    {
      "id": 227,
      "name": "Carboxylic Acids Derivatives",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry"
    },
    {
      "id": 228,
      "name": "Amines",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry"
    },
    {
      "id": 229,
      "name": "Biomolecules",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry"
    },
    {
      "id": 230,
      "name": "Polymers",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry",
      "adv": true
    },
    {
      "id": 231,
      "name": "Chemistry in Everyday Life",
      "theory": false,
      "practice": false,
      "section": "organic",
      "class": "12",
      "unit": "Organic Chemistry",
      "adv": true
    }
  ],
  "maths": [
    {
      "id": 301,
      "name": "Quadratic Equation",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Algebra"
    },
    {
      "id": 302,
      "name": "Complex Numbers",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Algebra"
    },
    {
      "id": 303,
      "name": "Permutations and Combinations",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Algebra"
    },
    {
      "id": 304,
      "name": "Binomial Theorem",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Algebra"
    },
    {
      "id": 305,
      "name": "Sequences and Series",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Algebra"
    },
    {
      "id": 306,
      "name": "Statistics",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Algebra"
    },
    {
      "id": 307,
      "name": "Trigonometric Functions",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Trigonometry"
    },
    {
      "id": 308,
      "name": "Triangle",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Trigonometry",
      "adv": true
    },
    {
      "id": 309,
      "name": "Straight Lines",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Coordinate Geometry"
    },
    {
      "id": 310,
      "name": "Circle",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Coordinate Geometry"
    },
    {
      "id": 311,
      "name": "Parabola",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Coordinate Geometry"
    },
    {
      "id": 312,
      "name": "Ellipse",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Coordinate Geometry"
    },
    {
      "id": 313,
      "name": "Hyperbola",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Coordinate Geometry"
    },
    {
      "id": 314,
      "name": "Limits and Derivatives",
      "theory": false,
      "practice": false,
      "class": "11",
      "unit": "Calculus"
    },
    {
      "id": 315,
      "name": "Matrices",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Algebra"
    },
    {
      "id": 316,
      "name": "Determinants",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Algebra"
    },
    {
      "id": 317,
      "name": "Probability",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Algebra"
    },
    {
      "id": 318,
      "name": "Inverse Trigonometric Functions",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Trigonometry"
    },
    {
      "id": 319,
      "name": "Sets Relations & Functions",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 320,
      "name": "Continuity and Differentiability",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 321,
      "name": "Method of Differentiation",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 322,
      "name": "Applications of Derivatives",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 323,
      "name": "Indefinite Integration",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 324,
      "name": "Definite Integration",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 325,
      "name": "Application of Integrals",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 326,
      "name": "Differential Equations",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Calculus"
    },
    {
      "id": 327,
      "name": "Vector Algebra",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Vectors & 3D"
    },
    {
      "id": 328,
      "name": "Three Dimensional Geometry",
      "theory": false,
      "practice": false,
      "class": "12",
      "unit": "Vectors & 3D"
    }
  ]
};

// Study-friendly chapter map, not an official chapter count. Official exam documents
// group topics into broader units; some topics span multiple entries here.
CANONICAL_JEE_SYLLABUS.physics.push({id:131,name:'Experimental Skills',theory:false,practice:false,class:'12',unit:'Experimental Skills'});
CANONICAL_JEE_SYLLABUS.chemistry.push(
  {id:232,name:'States of Matter: Gases and Liquids',theory:false,practice:false,class:'11',unit:'Physical Chemistry',section:'physical',adv:true},
  {id:233,name:'Environmental Chemistry',theory:false,practice:false,class:'11',unit:'Inorganic Chemistry',section:'inorganic',adv:true},
);
export const JEE_SYLLABUS_SOURCES = {
  mains: 'https://jeemain.nta.nic.in/document/syllabus-2026/',
  advanced: 'https://jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf',
  verifiedYear: 2026,
};

// Dates are personal targets, never unverified official examination dates.
export const JEE_EXAM_DATES: Record<string, {mainsJan?: string; mainsApr?: string; advanced?: string}> = {};
export function localJeeDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function getDaysUntil(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(`${localJeeDate()}T00:00:00`);
  return Math.round((target.getTime()-today.getTime())/86400000);
}
export function getDefaultJeeTrackState(): JeeTrackState {
  return {tests:[],upcoming:[],hours:[],backlogs:[],practiceLogs:[],syllabus:structuredClone(CANONICAL_JEE_SYLLABUS),backlogStreak:0,backlogBestStreak:0,lastBLClear:null,weeklyPracticeGoal:0,targetYear:String(new Date().getFullYear()+1),insights:null};
}
// Compatibility only: no unscoped storage writes or automatic account migration.
export function loadJeeTrackState(): JeeTrackState { return getDefaultJeeTrackState(); }
export function saveJeeTrackState(_state: JeeTrackState): void { /* Account store owns persistence. */ }
export { importJeeTrackData, exportJeeTrackData } from './jeeTrackValidation.ts';

export function generateJeeInsights(state: JeeTrackState): JeeAiInsightsResult {
  const tests = state.tests.filter(t => t.exam === 'mains').sort((a,b)=>a.date.localeCompare(b.date));
  const chapters = Object.values(state.syllabus).flat();
  const complete = chapters.filter(c=>c.theory && c.practice).length;
  const pending = state.backlogs.filter(b=>!b.done);
  const coverage = chapters.length ? complete/chapters.length : 0;
  const percentages = tests.map(t=>t.total/t.max);
  const delta = percentages.length >= 2 ? percentages.at(-1)!-percentages.at(-2)! : 0;
  const hasData = state.tests.length+state.practiceLogs.length+state.hours.length+complete > 0;
  const score = hasData ? Math.round(Math.max(0,Math.min(100,coverage*50+(percentages.at(-1)||0)*50))) : 0;
  const insights: JeeAiInsightItem[] = [{title: 'Recorded chapter coverage',tag:'Your records',type:'tip',body:`${complete} of ${chapters.length} chapters have both theory and practice marked complete. This is coverage, not an exam readiness estimate.`}];
  if(tests.length>=2) insights.push({title:'Recent mock change',tag:'Mock marks',type:delta>=0?'strength':'warning',body:`Your latest Mains mock percentage changed by ${(delta*100).toFixed(1)} percentage points compared with the previous test. Different test difficulty may affect this comparison.`});
  if(pending.length) insights.push({title:'Pending work',tag:'Backlogs',type:'warning',body:`${pending.length} recorded backlogs remain. Start with your own high-priority or overdue items.`});
  const actionPlan = pending.slice(0,3).map(b=>`Review and schedule: ${b.title}`);
  actionPlan.push(tests.length?'Review errors from your latest mock and choose the chapters that need practice.':'Log a mock test when you have a real score to establish a baseline.');
  actionPlan.push('Choose one incomplete chapter and schedule a realistic practice block.');
  return {overallVerdict:hasData?'Summary of your recorded preparation. The activity score combines recorded chapter coverage and latest mock marks; it does not predict rank or percentile.':'No preparation records yet. Log your own work to build a meaningful summary.',momentum:delta>0.05?'increasing':delta< -0.05?'decreasing':'stable',score,insights,actionPlan,generatedAt:new Date().toISOString()};
}
