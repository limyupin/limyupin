import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Puzzle from './pages/Puzzle';
// Import other components for additional pages

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Puzzle />} />

        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/puzzle" element={<Puzzle />} />
      </Routes>
    </Router>
  );
}

export default App;
