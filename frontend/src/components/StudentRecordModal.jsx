import { useCallback, useEffect, useState } from 'react';
import {
  X, Loader2, Save, ClipboardPaste, CheckCircle2, AlertCircle,
  ChevronDown, FileSignature, Wand2,
} from 'lucide-react';

import { getStudent, createStudent, updateStudent } from '../api/client';
import {
  SUBJECTS, LABS, IDENTITY_FIELDS, PROFILE_FIELDS, ATTENDANCE_FIELDS,
  subjectMarkFields, labFields, ADVANCED_FIELDS, ALL_EDITABLE_COLUMNS, isNumericField,
} from '../utils/studentFields';

const hideScrollbar =
  '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';

const toInputValue = (v) => (v === null || v === undefined ? '' : String(v));

function Field({ field, value, onChange, dark, disabled }) {
  const numeric = isNumericField(field.key);
  return (
    <label className="block">
      <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${dark ? 'text-slate-400' : 'text-black/60'}`}>
        {field.label}{field.required ? ' *' : ''}
      </span>
      <input
        type={numeric ? 'number' : 'text'}
        step={numeric ? 'any' : undefined}
        inputMode={numeric ? 'decimal' : 'text'}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`w-full border-2 border-black p-2.5 font-bold text-sm outline-none focus:bg-[#fef08a] ${dark ? 'bg-[#0f172a] text-white' : 'bg-white text-black'} ${disabled ? 'opacity-60 cursor-not-allowed bg-zinc-100' : ''}`}
      />
    </label>
  );
}

function FieldGrid({ fields, form, onChange, dark, disabledKeys = [], cols = 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }) {
  return (
    <div className={`grid ${cols} gap-3`}>
      {fields.map((f) => (
        <Field
          key={f.key}
          field={f}
          value={form[f.key]}
          onChange={onChange}
          dark={dark}
          disabled={disabledKeys.includes(f.key)}
        />
      ))}
    </div>
  );
}

function Group({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-4 border-black bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 bg-[#e9d5ff] font-black uppercase tracking-wider text-sm flex items-center justify-between border-b-2 border-black"
      >
        <span className="truncate">{title}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] bg-black text-white px-2 py-0.5">{count}</span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

/**
 * Full "complete student record" editor.
 *
 * Opens in *create* mode when `initialRoll` is empty, or *edit* mode when a roll
 * number is supplied (the record is fetched and prefilled). Saving POSTs a new
 * record or PUTs an update; the FastAPI service then re-assigns the student's
 * mentor. A JSON paste box lets you fill many fields at once from an object.
 */
export default function StudentRecordModal({ open, onClose, dark = false, initialRoll = '', onSaved }) {
  const [form, setForm] = useState({});
  const [mode, setMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const fill = useCallback((record) => {
    const next = {};
    ALL_EDITABLE_COLUMNS.forEach((key) => {
      next[key] = toInputValue(record?.[key]);
    });
    setForm(next);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    setShowJson(false);
    setJsonText('');
    const roll = String(initialRoll || '').trim();
    if (!roll) {
      setMode('create');
      fill({});
      return;
    }
    setMode('edit');
    setLoading(true);
    getStudent(roll)
      .then((rec) => fill(rec))
      .catch((err) => { setError(err); fill({ roll_no: roll }); })
      .finally(() => setLoading(false));
  }, [open, initialRoll, fill]);

  const onChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildPayload = () => {
    const payload = {};
    ALL_EDITABLE_COLUMNS.forEach((key) => {
      const raw = form[key];
      if (raw === undefined || raw === null || String(raw).trim() === '') return;
      if (isNumericField(key)) {
        const n = Number(raw);
        if (Number.isFinite(n)) payload[key] = n;
      } else {
        payload[key] = String(raw).trim();
      }
    });
    return payload;
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    const roll = String(payload.roll_no || '').trim();
    if (!roll) {
      setError(new Error('Roll number is required.'));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'create') {
        await createStudent(payload);
        setSuccess(`Saved ${roll} — mentor assigned automatically.`);
      } else {
        const target = String(initialRoll || roll).trim();
        await updateStudent(target, payload);
        setSuccess(`Updated ${target} — mentor re-assigned.`);
      }
      onSaved?.(roll);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('expected a JSON object like { "roll_no": "...", "coa_st1_marks": 18 }');
      }
      setForm((prev) => {
        const next = { ...prev };
        Object.entries(parsed).forEach(([k, v]) => { next[k] = toInputValue(v); });
        return next;
      });
      setError(null);
      setSuccess(`Loaded ${Object.keys(parsed).length} field(s) from JSON.`);
    } catch (err) {
      setSuccess(null);
      setError(new Error(`Invalid JSON: ${err.message}`));
    }
  };

  if (!open) return null;

  const recordCount = ALL_EDITABLE_COLUMNS.filter((k) => String(form[k] ?? '').trim() !== '').length;

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[110] p-3 sm:p-4 overflow-y-auto ${hideScrollbar}`}>
      <form
        onSubmit={save}
        className={`w-full max-w-6xl mx-auto my-4 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] ${dark ? 'bg-[#1e293b] text-white' : 'bg-[#f8fafc] text-black'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-4 border-black bg-[#93c5fd] text-black px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <FileSignature size={28} strokeWidth={2.5} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">
                {mode === 'create' ? 'New Student Record' : 'Edit Student Record'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest mt-1">
                {mode === 'create' ? 'Fill every field you have — only roll number is required' : `Roll ${initialRoll}`} · {recordCount} field(s) filled
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-black bg-white p-1.5 hover:bg-red-500 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-3 border-4 border-black bg-white text-black p-8 font-black uppercase">
              <Loader2 className="animate-spin" size={26} /> Loading full record…
            </div>
          ) : (
            <>
              {/* JSON paste helper */}
              <div className="border-4 border-black bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className="w-full px-4 py-3 bg-[#fef08a] font-black uppercase tracking-wider text-sm flex items-center justify-between border-b-2 border-black"
                >
                  <span className="flex items-center gap-2"><ClipboardPaste size={16} /> Paste full data as JSON (optional)</span>
                  <ChevronDown size={16} className={`transition-transform ${showJson ? 'rotate-180' : ''}`} />
                </button>
                {showJson && (
                  <div className="p-4">
                    <textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      rows={5}
                      placeholder={'{ "roll_no": "210029099999", "full_name": "New Student", "previous_cgpa": 7.4, "coa_st1_marks": 18 }'}
                      className="w-full border-2 border-black p-3 font-mono text-xs outline-none focus:bg-[#fef08a] bg-white text-black"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={applyJson}
                        className="flex items-center gap-2 bg-[#c4b5fd] text-black font-black uppercase text-xs border-2 border-black px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
                      >
                        <Wand2 size={15} /> Fill form from JSON
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Group title="1. Identity" count={3} defaultOpen>
                <FieldGrid
                  fields={IDENTITY_FIELDS}
                  form={form}
                  onChange={onChange}
                  dark={dark}
                  disabledKeys={mode === 'edit' ? ['roll_no'] : []}
                  cols="grid-cols-1 md:grid-cols-3"
                />
              </Group>

              <Group title="2. Profile & CGPA" count={PROFILE_FIELDS.length} defaultOpen>
                <FieldGrid fields={PROFILE_FIELDS} form={form} onChange={onChange} dark={dark} />
              </Group>

              <Group title="3. Attendance" count={ATTENDANCE_FIELDS.length} defaultOpen>
                <FieldGrid fields={ATTENDANCE_FIELDS} form={form} onChange={onChange} dark={dark} />
              </Group>

              {SUBJECTS.map((s, i) => {
                const fields = subjectMarkFields(s.key);
                return (
                  <Group key={s.key} title={`4.${i + 1} ${s.label} — theory marks`} count={fields.length}>
                    <FieldGrid fields={fields} form={form} onChange={onChange} dark={dark} />
                  </Group>
                );
              })}

              {LABS.map((l, i) => {
                const fields = labFields(l.key);
                return (
                  <Group key={l.key} title={`5.${i + 1} ${l.label} — lab marks`} count={fields.length}>
                    <FieldGrid fields={fields} form={form} onChange={onChange} dark={dark} cols="grid-cols-2 md:grid-cols-3" />
                  </Group>
                );
              })}

              <Group title="6. Advanced / derived" count={ADVANCED_FIELDS.length}>
                <FieldGrid fields={ADVANCED_FIELDS} form={form} onChange={onChange} dark={dark} cols="grid-cols-2 md:grid-cols-3" />
              </Group>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 border-t-4 border-black px-4 md:px-5 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between ${dark ? 'bg-[#0f172a]' : 'bg-white'}`}>
          <div className="min-w-0 flex-1">
            {error && (
              <p className="flex items-center gap-2 font-black uppercase text-xs text-black bg-[#fca5a5] border-2 border-black px-3 py-2">
                <AlertCircle size={16} className="shrink-0" /> <span className="truncate">{error.message}</span>
              </p>
            )}
            {success && !error && (
              <p className="flex items-center gap-2 font-black uppercase text-xs text-black bg-[#a7f3d0] border-2 border-black px-3 py-2">
                <CheckCircle2 size={16} className="shrink-0" /> <span className="truncate">{success}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-white text-black border-2 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#a7f3d0] text-black border-2 border-black font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-none transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              {mode === 'create' ? 'Create Record' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
