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
    <Router>
      <div className="App">
        <Header onClick={handleClick} />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/Map" element={<MapPage />} />
              <Route path="/RecordsPage" element={<RecordsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
