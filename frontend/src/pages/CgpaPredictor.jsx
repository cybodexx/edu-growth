import { useState } from 'react';
import { Calculator, Loader2, Zap } from 'lucide-react';
import { predictCgpa } from '../api/client';
import { DEMO_STUDENT } from '../config/identities';

/**
 * Standalone CGPA predictor.
 *
 * NOTE: the FastAPI endpoint is POST /api/v1/cgpa/predict with body
 * { "roll_no": "..." } — the model reads the student's stored row, so there is
 * no manual marks entry. The Student dashboard embeds this same flow.
 */
export default function CgpaPredictor() {
  const [rollNo, setRollNo] = useState(DEMO_STUDENT.roll_no);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictCgpa(rollNo.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm font-bold';

  return (
    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-xl mt-8">
      <h2 className="text-xl font-bold mb-2 text-slate-100">AI CGPA Predictor</h2>
      <p className="text-xs text-slate-400 mb-6">
        The model loads the student's stored row from the database — no manual marks needed.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          placeholder="Roll number (e.g. 210029023375)"
          required
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 font-bold py-3 rounded-lg hover:bg-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="animate-spin w-5 h-5" /> Running inference…</> : <><Calculator className="w-5 h-5" /> Run Prediction Engine</>}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-rose-900/20 text-rose-400 border border-rose-800/50 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-6 p-6 bg-slate-800/50 border border-emerald-500/30 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Zap size={12} /> Predicted Grade</p>
            <p className="text-4xl font-black text-emerald-400">{Number(result.predicted_grade ?? 0).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Model Confidence</p>
            <p className="text-2xl font-bold text-slate-200">{result.confidence_display || `${result.confidence_score}%`}</p>
          </div>
        </div>
      )}
    </div>
  );
}
