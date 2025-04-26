import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import Header from './Header';
import Sidebar from './Sidebar';
import Home from './Home';
import MapPage from './Map';
import RecordsPage from './RecordsPage';



function App() {
  const handleClick = () => {
    alert("Welcome to MSU-IIT National Multi-purpose Cooperative!");
  };

  return (
    <div className="App">
      <Header onClick={handleClick} />
      <Router>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="Map" element={<MapPage />} />
        <Route path="RecordsPage" element={<RecordsPage />} />

        {/* other routes */}
      </Routes>
    </Router>
      <main className="main-content">
        {/* You can add Routes, Pages or Content here */}
        {/* <h2>Welcome to the Dashboard</h2> */}
      </main>
    </div>
  );
}

export default App;
