import React, { useState } from "react";
import "./App.css";

import Login from "./pages/Login.jsx";
import Student from "./pages/Student.jsx";
import Teacher from "./pages/Teacher.jsx";

function App() {
   const [screen, setScreen] = useState("login");

   return (
       <div>
           {screen === "login" && (
               <Login setScreen={setScreen} />
           )}

           {screen === "student" && (
               <Student setScreen={setScreen} />
           )}

           {screen === "teacher" && (
               <Teacher setScreen={setScreen} />
           )}

           {screen === "admin" && (
               <div className="container">
                   <h2>Admin Dashboard</h2>

                   <button
                       className="btn btn-secondary"
                       onClick={() => setScreen("login")}
                   >
                       Back to Login
                   </button>
               </div>
           )}
       </div>
   );
}

export default App;
