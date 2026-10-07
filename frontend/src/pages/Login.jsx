jsx
import React from "react";

export default function Login({ setScreen }) {
    return (
        <div className="login">
            <div className="card login-card">
                <h2>Edu Growth Portal</h2>

                <p>Select your portal to continue</p>

                <button
                    className="btn btn-primary"
                    onClick={() => setScreen("student")}
                >
                    Login as Student
                </button>

                <button
                    className="btn btn-secondary"
                    onClick={() => setScreen("teacher")}
                >
                    Login as Faculty
                </button>

                <button
                    className="btn btn-secondary"
                    onClick={() => setScreen("admin")}
                >
                    Login as Admin
                </button>
            </div>
        </div>
    );
}



