import {
  getStudent,
  getStudentAnalysis,
  predictCgpa,
  normalizeStudent,
} from './client';

/**
 * Normalise a mentor/risk analysis payload into the common shape the UI uses.
 * Mentor responses already contain subjects/labs/recommendations. If the API
 * only exposes /risk, its `predictions` are promoted to subject cards so the
 * UI still renders.
 */
export function normalizeAnalysis(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const subjects = Array.isArray(raw.subjects) ? raw.subjects : [];
  const labs = Array.isArray(raw.labs) ? raw.labs : [];
  const recommendations = Array.isArray(raw.recommendations) ? raw.recommendations : [];

  // Interpret any of the flag shapes the API may use: the /risk endpoint
  // returns { prediction: 0|1, status: 'At Risk'|'Safe' }, while other
  // payloads may use is_at_risk / risk booleans.
  const isAtRisk = (p) => {
    if (typeof p.is_at_risk === 'boolean') return p.is_at_risk;
    if (typeof p.risk === 'boolean') return p.risk;
    if (p.prediction != null) return Number(p.prediction) === 1;
    const status = String(p.status || '').toLowerCase().trim();
    return status === 'weak' || status === 'at risk' || status === 'high' || status === 'critical';
  };

  let derivedSubjects = subjects;
  if (!derivedSubjects.length && Array.isArray(raw.predictions)) {
    derivedSubjects = raw.predictions.map((p) => {
      const risky = isAtRisk(p);
      const score =
        p.score_pct ??
        p.score ??
        p.percentage ??
        (p.probability != null ? Math.round(Number(p.probability) * 1000) / 10 : undefined);
      return {
        subject: p.subject || p.subject_name || p.name || 'Subject',
        label: p.label || p.subject_label || p.subject || 'Subject',
        score_pct: score,
        status: risky ? 'weak' : 'ok',
        current_teacher: p.current_teacher || p.teacher,
        attendance_pct: p.attendance_pct,
        units: [],
        weak_units: p.weak_units || [],
        mentor_needed: p.mentor_needed ?? risky,
        mentor: p.mentor || null,
        peer_mentor: p.peer_mentor || null,
        suggested_action: p.suggested_action || p.action,
        reason: p.reason,
        risk_probability: p.probability,
      };
    });
  }

  return {
    ...raw,
    subjects: derivedSubjects,
    labs,
    recommendations,
    academic_metrics: raw.academic_metrics || {},
    clustering: raw.clustering || {},
    risk_level: raw.risk_level || raw.clustering?.risk_level || null,
    priority_rank: raw.priority_rank,
  };
}

/** Every weak/at-risk subject and lab, unified. */
export function weakAreas(analysis) {
  if (!analysis) return [];
  const subs = (analysis.subjects || [])
    .filter((s) => s.mentor_needed || s.status === 'weak')
    .map((s) => ({ ...s, kind: 'subject', displayName: s.label || s.subject }));
  const labs = (analysis.labs || [])
    .filter((l) => l.mentor_needed || l.status === 'weak')
    .map((l) => ({ ...l, kind: 'lab', displayName: l.label || l.lab }));
  return [...subs, ...labs];
}

/**
 * Load everything the UI needs for one student, tolerating individual
 * failures (e.g. the CGPA model being unavailable) via allSettled.
 *
 * `id` may be a roll number OR a full name (mentor routes accept both).
 */
export async function buildDossier(id, opts = {}) {
  const analysisWrap = await getStudentAnalysis(id, opts); // throws if unknown student
  const analysis = normalizeAnalysis(analysisWrap.data);
  const roll = analysis?.roll_no != null ? String(analysis.roll_no) : String(id);

  const [studentRes, cgpaRes] = await Promise.allSettled([
    getStudent(roll, opts),
    predictCgpa(roll, opts),
  ]);

  return {
    id: roll,
    source: analysisWrap.source, // 'mentor' | 'risk'
    analysis,
    student: studentRes.status === 'fulfilled' ? normalizeStudent(studentRes.value) : null,
    cgpa: cgpaRes.status === 'fulfilled' ? cgpaRes.value : null,
    cgpaError: cgpaRes.status === 'rejected' ? cgpaRes.reason : null,
  };
}
