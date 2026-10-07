import React from 'react';

import CgpaPredictor from './CgpaPredictor'; 

export default function Student({ setScreen }) {
  return (
    <div className="container">
      <div className="header">
        <div>
          <h2>Aarav Sharma</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>B.Tech CSE | Roll No: 2201640100182</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setScreen('login')}>Logout</button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid-4">
        <div className="card">
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Attendance</p>
          <h3 className="text-green">88.4%</h3>
        </div>
        <div className="card">
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Predicted CGPA</p>
          <h3>7.68</h3>
        </div>
        <div className="card">
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Assignments</p>
          <h3>8/10 Submitted</h3>
        </div>
        <div className="card">
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Faculty Mentor</p>
          <h3>Dr. Neha Gupta</h3>
        </div>
      </div>

      {/* Middle Section: Assessment Ledger */}
      <h3 style={{ marginBottom: '1rem', marginTop: '2rem' }}>Module Assessment Ledger</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>ST-1</th>
              <th>ST-2</th>
              <th>PUT</th>
              <th>Learning Velocity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Compiler Design</td>
              <td>14/30</td>
              <td>22/30</td>
              <td>71/100</td>
              <td className="text-green">+8 Pts Improved</td>
            </tr>
            <tr>
              <td>Data Structures</td>
              <td>28/30</td>
              <td>26/30</td>
              <td>85/100</td>
              <td className="text-red">-2 Pts Declined</td>
            </tr>
            <tr>
              <td>Cyber Security</td>
              <td>19/30</td>
              <td>24/30</td>
              <td>66/100</td>
              <td className="text-green">+5 Pts Improved</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Section: AI CGPA Predictor */}
      <div style={{ marginTop: '3rem' }}>
        <CgpaPredictor />
      </div>
      
    </div>
  );
}