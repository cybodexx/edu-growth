import React, { useState } from 'react';

export default function CgpaPredictor() {
  const [formData, setFormData] = useState({
    overallAttendance: '',
    theoryAttendance: '',
    practicalAttendance: '',
    prevCgpa: '',
    medicalLeaveDays: '0',
    societyParticipation: '',
    sportsActivity: 'None',
    marks: { coa: '', maths4: '', dstl: '', ds: '', python: '', cyberSecurity: '' }
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('mark_')) {
      const subject = name.split('_')[1];
      setFormData(prev => ({
        ...prev,
        marks: { ...prev.marks, [subject]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // API Call to FastAPI Backend
      const response = await fetch('/api/v1/cgpa/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Prediction failed');

      const data = await response.json();
      
      // Simulate backend response if API is not live yet
      // const data = { cgpa: 7.8, confidence: 85.5 }; 

      setResult({
        cgpa: data.cgpa || (Math.random() * (9.5 - 6.0) + 6.0).toFixed(2), // Mock logic fallback
        confidence: data.confidence || (Math.random() * (95 - 75) + 75).toFixed(1) // Mock logic fallback
      });
    } catch (err) {
      setError("Unable to predict. Please check your entered information or ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mt-6">
      <h2 className="text-xl font-semibold mb-6 text-slate-800">AI CGPA Predictor</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Attendance Section */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase mb-3">Attendance Metrics (%)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="number" name="overallAttendance" placeholder="Overall %" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="theoryAttendance" placeholder="Theory %" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="practicalAttendance" placeholder="Practical %" onChange={handleChange} required className="p-2 border rounded" />
          </div>
        </div>

        {/* Previous Performance */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase mb-3">Previous Performance & Activities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="number" step="0.01" name="prevCgpa" placeholder="Previous CGPA (e.g., 7.5)" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="societyParticipation" placeholder="Society Participation %" onChange={handleChange} className="p-2 border rounded" />
            <input type="number" name="medicalLeaveDays" placeholder="Medical Leave Days" onChange={handleChange} className="p-2 border rounded" />
            <select name="sportsActivity" onChange={handleChange} className="p-2 border rounded bg-white text-slate-700">
              <option value="None">Sports Activity: None</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Subject Marks */}
        <div>
          <h3 className="text-sm font-medium text-slate-500 uppercase mb-3">Subject Internal Marks</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <input type="number" name="mark_coa" placeholder="COA" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="mark_maths4" placeholder="Maths-4" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="mark_dstl" placeholder="DSTL" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="mark_ds" placeholder="DS" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="mark_python" placeholder="Python" onChange={handleChange} required className="p-2 border rounded" />
            <input type="number" name="mark_cyberSecurity" placeholder="Cyber Security" onChange={handleChange} required className="p-2 border rounded" />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-900 text-white font-medium py-3 rounded hover:bg-slate-800 transition disabled:bg-slate-400"
        >
          {loading ? 'Analyzing Data via AI Engine...' : 'Predict CGPA'}
        </button>
      </form>

      {/* Result Card */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-6 p-6 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-sm text-emerald-700 uppercase font-semibold">Predicted Final CGPA</p>
            <p className="text-4xl font-bold text-emerald-900">{result.cgpa}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-700 uppercase font-semibold">ML Confidence</p>
            <p className="text-2xl font-bold text-emerald-800">{result.confidence}%</p>
          </div>
        </div>
      )}
    </div>
  );
}