jsx
import React from "react";

 export default function Teacher({ setScreen }) {
    return (
        <div className="container">

            <div className="header">
                <div>
                    <h2>Prof. Rajesh K. Verma</h2>
                    <p className="sub-text">
                        Compiler Design | Batch 2026
                    </p>
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => setScreen("login")}
                >
                    Logout
                </button>
            </div>

            <div className="grid-4">

                <div className="card">
                    <p className="sub-text">Cohort Enrolled</p>
                    <h3>64 Students</h3>
                </div>

                <div className="card">
                    <p className="sub-text">Critical Risk</p>
                    <h3 className="text-red">8 Students</h3>
                </div>

                <div className="card">
                    <p className="sub-text">Batch Average</p>
                    <h3>76%</h3>
                </div>

            </div>

            <h3 className="section-title">
                Intervention Risk Register
            </h3>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Attendance</th>
                            <th>Recent Problem</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>

                        <tr>
                            <td>Pooja N. Kulkarni</td>
                            <td className="text-red">60%</td>
                            <td>Failed Mid-Term 1</td>
                            <td>
                                <span className="badge-red">At Risk</span>
                            </td>
                        </tr>

                        <tr>
                            <td>Rahul Sharma</td>
                            <td>85%</td>
                            <td>Missed 2 Labs</td>
                            <td>
                                <span className="badge-red">Watchlist</span>
                            </td>
                        </tr>

                        <tr>
                            <td>Meera V. Nambiar</td>
                            <td className="text-green">92%</td>
                            <td>None</td>
                            <td>
                                <span className="badge-green">Safe</span>
                            </td>
                        </tr>

                    </tbody>
                </table>
            </div>

        </div>
    );
}



