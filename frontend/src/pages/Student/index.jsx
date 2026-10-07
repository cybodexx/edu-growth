import React from 'react';
import { TrendingUp, Clock, BrainCircuit, CheckCircle, AlertCircle } from 'lucide-react';
import VelocityChart from '../../components/charts/VelocityChart';
// Note: Ensure your mockData.js exports an object like studentMetrics
// import { studentMetrics } from '../../utils/mockData';

export default function StudentDashboard() {
  // Fallback dummy data in case mockData is not linked yet
  const metrics = {
    attendance: { percentage: 88, trend: "+2% this week", status: "safe" },
    assignments: { delayed: 2, description: "Delayed submissions", status: "warning" },
    retention: { index: "High", description: "Based on recent micro-tests" },
    recentAssessments: [
      { name: "ST1 Examination - Unit 1", score: "78%", passed: true },
      { name: "Unit 2 Weekly Quiz", score: "82%", passed: true },
      { name: "ST2 Examination - Unit 3", score: "45%", passed: false }
    ]
  };

  return (