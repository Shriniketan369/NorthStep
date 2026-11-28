// NorthStep scoring server (Supabase Edge Function "score").
//
// What it does, in plain words
//   * The app asks it two things: "may I show this person their fit score yet?" (op "status") and
//     "score this roadmap and record it" (op "fit").
//   * It works out who is asking from their sign-in token, never from anything the app says about itself.
//   * It calculates the fit score on the server and saves it in the `scores` table together with the model version.
//   * For people in the hidden-score test group, it saves the score but does NOT send the number back
//     until they have done their day-21 check-in. The database enforces the same rule (row-level security).
//
// The model below is stage 1 of the NorthStep algorithm spec (five personal factors). It matches fit.py and index.html; the parity tests check all three.
// When the calibrated model replaces it, change MODEL_VERSION so old and new scores are never mixed up.

export const MODEL_VERSION = 'stage1-1';
// deno-lint-ignore no-explicit-any
const M: any = {
 "DK": [
  "tech",
  "design",
  "business",
  "health",
  "research",
  "education"
 ],
 "HOB": {
  "Coding": {
   "tech": 1,
   "research": 0.5,
   "design": 0.3,
   "business": 0.2
  },
  "Gaming": {
   "tech": 0.7,
   "design": 0.5,
   "business": 0.2,
   "research": 0.2
  },
  "Drawing": {
   "design": 1,
   "education": 0.2
  },
  "Photography": {
   "design": 0.8,
   "business": 0.3
  },
  "Writing": {
   "education": 0.6,
   "business": 0.4,
   "design": 0.4,
   "research": 0.5
  },
  "Reading": {
   "research": 0.7,
   "education": 0.6,
   "business": 0.3,
   "health": 0.3,
   "tech": 0.2
  },
  "Music": {
   "design": 0.6,
   "education": 0.4,
   "health": 0.2
  },
  "Sports & fitness": {
   "health": 0.8,
   "business": 0.3,
   "education": 0.4
  },
  "Volunteering": {
   "health": 0.7,
   "education": 0.8,
   "business": 0.2
  },
  "Cooking": {
   "business": 0.5,
   "health": 0.5,
   "design": 0.3
  },
  "Science experiments": {
   "research": 1,
   "health": 0.6,
   "tech": 0.5
  },
  "Investing": {
   "business": 1,
   "tech": 0.3,
   "research": 0.3
  },
  "Public speaking": {
   "business": 0.8,
   "education": 0.9,
   "design": 0.2
  },
  "Editing videos": {
   "design": 0.9,
   "business": 0.4,
   "tech": 0.4
  },
  "Teaching others": {
   "education": 1,
   "health": 0.4,
   "business": 0.3
  },
  "Building things": {
   "tech": 0.7,
   "design": 0.6,
   "research": 0.5,
   "business": 0.4
  }
 },
 "FIELD_AFF": {
  "cs": {
   "tech": 1,
   "design": 0.5,
   "business": 0.55,
   "health": 0.3,
   "research": 0.6,
   "education": 0.4
  },
  "eng": {
   "tech": 0.85,
   "design": 0.45,
   "business": 0.55,
   "health": 0.4,
   "research": 0.75,
   "education": 0.45
  },
  "biz": {
   "tech": 0.4,
   "design": 0.4,
   "business": 1,
   "health": 0.3,
   "research": 0.35,
   "education": 0.5
  },
  "life": {
   "tech": 0.35,
   "design": 0.2,
   "business": 0.35,
   "health": 1,
   "research": 0.85,
   "education": 0.55
  },
  "arts": {
   "tech": 0.3,
   "design": 1,
   "business": 0.5,
   "health": 0.3,
   "research": 0.4,
   "education": 0.75
  },
  "other": {
   "tech": 0.4,
   "design": 0.4,
   "business": 0.4,
   "health": 0.4,
   "research": 0.4,
   "education": 0.4
  }
 },
 "FIELD_MAP": {
  "Computer science / IT": "cs",
  "Engineering": "eng",
  "Business / Commerce": "biz",
  "Life sciences / Medical": "life",
  "Arts / Design / Humanities": "arts",
  "Something else": "other"
 },
 "STREAM_MAP": {
  "Science": "eng",
  "Commerce": "biz",
  "Arts / Humanities": "arts",
  "Not decided yet": "other"
 },
 "TIMELINE": {
  "6 months": 6,
  "1 year": 12,
  "2–3 years": 30,
  "5+ years": 60
 },
 "EXPY": {
  "Under 1": 0.25,
  "1–3": 0.45,
  "3–7": 0.65,
  "7+": 0.8
 },
 "BUDGET": {
  "Free resources only": 0.75,
  "Up to $50 / month": 0.9,
  "Flexible budget": 1
 },
 "W": {
  "A": 0.29,
  "I": 0.29,
  "T": 0.21,
  "P": 0.14,
  "R": 0.07
 },
 "BLOCK": [
  "Finding time",
  "Limited money",
  "Unclear direction",
  "Low confidence",
  "Staying consistent"
 ],
 "OPT": {
  "age": [
   "Under 18",
   "18–22",
   "23–29",
   "30–39",
   "40+"
  ],
  "edu": [
   "High school",
   "Diploma / vocational",
   "Undergraduate (in progress)",
   "Bachelor’s completed",
   "Master’s or higher",
   "Self-taught"
  ],
  "stream": [
   "Science",
   "Commerce",
   "Arts / Humanities",
   "Not decided yet"
  ],
  "field": [
   "Computer science / IT",
   "Engineering",
   "Business / Commerce",
   "Life sciences / Medical",
   "Arts / Design / Humanities",
   "Something else"
  ],
  "standing": [
   "Top of the class",
   "Comfortably good",
   "Average",
   "Struggling a bit"
  ],
  "status": [
   "Studying full-time",
   "Working full-time",
   "Job hunting",
   "Switching careers",
   "Freelancing / building something"
  ],
  "exp": [
   "Under 1",
   "1–3",
   "3–7",
   "7+"
  ],
  "search": [
   "Under 1 month",
   "1–3 months",
   "3–6 months",
   "6+ months"
  ],
  "goal": [
   "6 months",
   "1 year",
   "2–3 years",
   "5+ years"
  ],
  "budget": [
   "Free resources only",
   "Up to $50 / month",
   "Flexible budget"
  ]
 },
 "DQ": {
  "tech": [
   [
    "Python",
    "Web (HTML, CSS, JS)",
    "Java or C++",
    "SQL or data work",
    "Nothing yet"
   ],
   [
    "A guided beginner course",
    "A small first project",
    "A study group or mentor"
   ],
   [
    "Build a bigger project",
    "Algorithms and interviews",
    "A specialisation: AI, cloud or security"
   ]
  ],
  "design": [
   [
    "Figma or similar",
    "Sketching",
    "Typography",
    "User research",
    "Nothing yet"
   ],
   [
    "Daily design drills",
    "Redesign an app I use",
    "A critique group"
   ],
   [
    "A full case study",
    "Motion and interaction",
    "Design systems"
   ]
  ],
  "business": [
   [
    "Selling something",
    "Spreadsheets and finance",
    "Marketing or social",
    "Running a project",
    "Nothing yet"
   ],
   [
    "Test a small idea",
    "Learn finance basics",
    "Shadow a founder"
   ],
   [
    "Launch a real offer",
    "Unit economics",
    "Hiring and operations"
   ]
  ],
  "health": [
   [
    "Volunteering or shadowing",
    "Biology courses",
    "First aid",
    "Patient-facing work",
    "Nothing yet"
   ],
   [
    "Shadow a practitioner",
    "A short biology refresher",
    "Talk to students in the field"
   ],
   [
    "Clinical hours",
    "Exam preparation",
    "A specialty area"
   ]
  ],
  "research": [
   [
    "Lab or field work",
    "Statistics",
    "Reading papers",
    "Writing a report",
    "Nothing yet"
   ],
   [
    "Read three papers on one topic",
    "A small replication",
    "Join a research group"
   ],
   [
    "Run my own study",
    "Advanced statistics",
    "Write for publication"
   ]
  ],
  "education": [
   [
    "Tutoring",
    "Presenting or teaching",
    "Curriculum planning",
    "Mentoring",
    "Nothing yet"
   ],
   [
    "Teach one short lesson",
    "Shadow a teacher",
    "Take a facilitation course"
   ],
   [
    "Design a full course",
    "Assessment and feedback",
    "Coaching certification"
   ]
  ]
 },
 "SKP": [
  "Programming",
  "Mathematics",
  "Data analysis",
  "Systems thinking",
  "Project management",
  "Communication",
  "Visual design",
  "Research methods",
  "Communication",
  "Writing",
  "Project management",
  "Programming",
  "Finance basics",
  "Communication",
  "Project management",
  "Data analysis",
  "Writing",
  "Research methods",
  "Biology basics",
  "Communication",
  "Research methods",
  "Data analysis",
  "Systems thinking",
  "Writing",
  "Mathematics",
  "Research methods",
  "Data analysis",
  "Writing",
  "Programming",
  "Systems thinking",
  "Communication",
  "Writing",
  "Project management",
  "Research methods",
  "Visual design",
  "Systems thinking"
 ],
 "DOM": {
  "tech": {
   "base": 0.66,
   "demand": 0.88,
   "hours": 12,
   "months": 14,
   "tracks": [
    "web",
    "ai",
    "cloud",
    "game"
   ]
  },
  "design": {
   "base": 0.55,
   "demand": 0.7,
   "hours": 10,
   "months": 12,
   "tracks": [
    "ux",
    "brand",
    "motion",
    "web"
   ]
  },
  "business": {
   "base": 0.52,
   "demand": 0.8,
   "hours": 10,
   "months": 16,
   "tracks": [
    "pm",
    "growth",
    "found",
    "ops"
   ]
  },
  "health": {
   "base": 0.72,
   "demand": 0.9,
   "hours": 14,
   "months": 30,
   "tracks": [
    "clin",
    "nutr",
    "ht",
    "mh"
   ]
  },
  "research": {
   "base": 0.48,
   "demand": 0.62,
   "hours": 14,
   "months": 36,
   "tracks": [
    "ds",
    "bio",
    "phys",
    "soc"
   ]
  },
  "education": {
   "base": 0.7,
   "demand": 0.72,
   "hours": 8,
   "months": 12,
   "tracks": [
    "school",
    "id",
    "coach",
    "skill"
   ]
  }
 }
};

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const num = (v: unknown, a: number, b: number, d: number) => { const n = +(v as number); return isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const known = (v: unknown, list: string[]) => (typeof v === 'string' && list.includes(v) ? v : undefined);
// deno-lint-ignore no-control-regex
const INVIS = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁠-⁤⁦-⁩﻿]/g;
function cleanText(s: unknown, max: number) {
  let t = String(s == null ? '' : s);
  try { t = t.normalize('NFC'); } catch (_e) { /* ignore */ }
  t = t.replace(INVIS, '').replace(/\s+/g, ' ').trim();
  const a = Array.from(t);
  return a.length > max ? a.slice(0, max).join('').trim() : t;
}

// Same rules as cleanA() in index.html: only known answers survive, numbers are clamped, lists are capped.
// deno-lint-ignore no-explicit-any
export function cleanA(a: any) {
  a = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  // deno-lint-ignore no-explicit-any
  const o: any = {};
  const nm = cleanText(a.name, 40); if (a.name != null) o.name = nm;
  ['age', 'edu', 'stream', 'field', 'standing', 'status', 'exp', 'search', 'goal', 'budget'].forEach((k) => {
    const v = known(a[k], M.OPT[k]); if (v !== undefined) o[k] = v;
  });
  const dm = known(a.domain, M.DK.concat(['unsure']));
  if (dm) o.domain = dm;
  if (dm && dm !== 'unsure') {
    const tk = known(a.track, M.DOM[dm].tracks); if (tk) o.track = tk;
    const dq = M.DQ[dm];
    if (dq) {
      if (Array.isArray(a.dq1)) o.dq1 = [...new Set((a.dq1 as unknown[]).filter((x) => typeof x === 'string' && dq[0].includes(x)))].slice(0, 4);
      const d2 = known(a.dq2, dq[1].concat(dq[2])); if (d2) o.dq2 = d2;
    }
  }
  if (a.hours != null) o.hours = Math.round(num(a.hours, 2, 40, 8));
  if (a.sat != null) o.sat = Math.round(num(a.sat, 1, 10, 5));
  if (Array.isArray(a.hobbies)) o.hobbies = [...new Set((a.hobbies as unknown[]).filter((h) => typeof h === 'string' && own(M.HOB, h)))].slice(0, 5);
  if (Array.isArray(a.blockers)) o.blockers = [...new Set((a.blockers as unknown[]).filter((b) => typeof b === 'string' && M.BLOCK.includes(b)))].slice(0, 3);
  if (a.nicheFit != null) o.nicheFit = num(a.nicheFit, 0, 100, 0);
  if (a.pivot && typeof a.pivot === 'object') {
    const pf = known(a.pivot.from, M.DK);
    if (pf) {
      const lst = (x: unknown) => (Array.isArray(x) ? [...new Set((x as unknown[]).filter((y) => typeof y === 'string' && M.SKP.includes(y)))].slice(0, 8) : []);
      o.pivot = { from: pf, solid: lst(a.pivot.solid), partial: lst(a.pivot.partial), gaps: lst(a.pivot.gaps), sv: num(a.pivot.sv, 0, .55, 0) };
    }
  }
  return o;
}

// Halves round to the even number, as in the Python spec code (fit.py), so range widths match.
const rhe = (x: number) => { const f = Math.floor(x), d = x - f; return d === .5 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); };
const lvl = (s: number) => (s >= 75 ? 'Strong fit' : s >= 55 ? 'Moderate fit' : 'Stretch');

// Same arithmetic as compute() in index.html (score part only).
// deno-lint-ignore no-explicit-any
export function computeFit(a: any) {
  const D = M.DOM[a.domain];
  const fk = a.edu === 'High school' ? (M.STREAM_MAP[a.stream] || 'other') : (M.FIELD_MAP[a.field] || 'other');
  const A = M.FIELD_AFF[fk][a.domain];
  const hv = (a.hobbies || []).map((h: string) => (((M.HOB[h] || {})[a.domain]) ?? .1));
  const Ih = hv.length ? clamp((hv.reduce((s: number, x: number) => s + x, 0) / hv.length) / .75, 0, 1) : null;
  const In = a.nicheFit != null ? clamp(a.nicheFit / 100, 0, 1) : null;
  const I = Ih != null && In != null ? (Ih + In) / 2 : (Ih != null ? Ih : (In != null ? In : .3));
  const months = M.TIMELINE[a.goal] || 12, need = Math.max(D.hours * Math.sqrt(12 / months), 7.5);
  const T = clamp((a.hours || 8) / need, 0, 1);
  let P = a.status === 'Studying full-time' ? .3 : a.status === 'Job hunting' ? .35 : a.status === 'Freelancing / building something' ? .5 : (M.EXPY[a.exp] ?? .4);
  if (['Working full-time', 'Switching careers', 'Freelancing / building something'].includes(a.status) && M.EXPY[a.exp] != null) P = M.EXPY[a.exp];
  P += ({ 'Top of the class': .1, 'Comfortably good': .05, 'Struggling a bit': -.05 } as Record<string, number>)[a.standing] || 0;
  if (A >= .8) P += .1;
  if (a.status === 'Switching careers' && A < .5) P *= .85;
  P = clamp(P, 0, 1);
  const R = M.BUDGET[a.budget] ?? .8;
  const f = [
    { k: 'A', v: A, w: M.W.A }, { k: 'I', v: I, w: M.W.I }, { k: 'T', v: T, w: M.W.T }, { k: 'P', v: P, w: M.W.P }, { k: 'R', v: R, w: M.W.R },
  ];
  const raw = 100 * f.reduce((s, x) => s + x.v * x.w, 0), score = rhe(clamp(raw, 0, 100));
  const answered = ['domain', 'edu', 'stream', 'field', 'standing', 'status', 'exp', 'hobbies', 'nicheFit', 'hours', 'goal', 'budget']
    .filter((k) => { const v = a[k]; return v != null && v !== '' && !(Array.isArray(v) && !v.length); }).length, margin = Math.max(3, rhe(11 - answered * .45));
  return { score, raw, margin, level: lvl(score), factors: Object.fromEntries(f.map((x) => [x.k, Math.round(x.v * 1000) / 1000])), context: { base: D.base, demand: D.demand } };
}

async function sha256(t: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
}
// Stable text for an answers object, so the same answers always give the same fingerprint.
// deno-lint-ignore no-explicit-any
const canon = (v: any): string => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-max-age': '86400',
};
const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_BODY = 20000;

export type Deps = {
  getUser: (jwt: string) => Promise<{ id: string } | null>;
  // deno-lint-ignore no-explicit-any
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: { message?: string; code?: string } | null }>;
};

export function makeHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return out(405, { error: 'method' });
    const m = /^Bearer\s+([A-Za-z0-9._-]{20,4000})$/.exec(req.headers.get('authorization') || '');
    if (!m) return out(401, { error: 'signin' });
    let user: { id: string } | null = null;
    try { user = await deps.getUser(m[1]); } catch (_e) { return out(503, { error: 'auth_down' }); }
    if (!user || !UUID.test(user.id)) return out(401, { error: 'signin' });

    let text = '';
    try { text = await req.text(); } catch (_e) { return out(400, { error: 'body' }); }
    if (text.length > MAX_BODY) return out(413, { error: 'too_big' });
    // deno-lint-ignore no-explicit-any
    let body: any;
    try { body = JSON.parse(text || '{}'); } catch (_e) { return out(400, { error: 'json' }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return out(400, { error: 'json' });

    try {
      if (body.op === 'status') {
        const r = await deps.rpc('score_context', { p_user: user.id });
        if (r.error) return out(503, { error: 'db' });
        return out(200, { known: !!(r.data && r.data.known), visible: !!(r.data && r.data.known && r.data.visible) });
      }
      if (body.op === 'fit') {
        const a = cleanA(body.a);
        if (!a.domain || a.domain === 'unsure') return out(400, { error: 'answers' });
        const cid = typeof body.cid === 'string' && UUID.test(body.cid) ? body.cid : null;
        const s = computeFit(a);
        const ahash = await sha256(canon(a));
        const r = await deps.rpc('record_score', {
          p_user: user.id, p_version: MODEL_VERSION, p_value: s.score,
          p_payload: { cid, ahash, margin: s.margin, factors: s.factors, domain: a.domain },
        });
        if (r.error) return out(/too many/i.test(r.error.message || '') ? 429 : 503, { error: 'db' });
        const visible = !!(r.data && r.data.known && r.data.visible);
        // The number only leaves the server when the person is allowed to see it.
        return visible
          ? out(200, { known: true, visible: true, model: MODEL_VERSION, score: s.score, margin: s.margin, level: s.level })
          : out(200, { known: !!(r.data && r.data.known), visible: false, model: MODEL_VERSION });
      }
      return out(400, { error: 'op' });
    } catch (_e) {
      return out(500, { error: 'server' });
    }
  };
}

// Start-up on Supabase. (Skipped when the file is loaded by the tests.)
// deno-lint-ignore no-explicit-any
const D: any = (globalThis as any).Deno;
if (D && D.serve && D.env) {
  const url = D.env.get('SUPABASE_URL'), service = D.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const { createClient } = await import('npm:@supabase/supabase-js@2.119.0');
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  D.serve(makeHandler({
    getUser: async (jwt) => { const r = await admin.auth.getUser(jwt); return r.error || !r.data.user ? null : { id: r.data.user.id }; },
    rpc: async (fn, args) => { const r = await admin.rpc(fn, args); return { data: r.data, error: r.error }; },
  }));
}
