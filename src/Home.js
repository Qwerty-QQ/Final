import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="home">
      {/* <h2>Welcome to Our Web App</h2> */}

      <img 
        src={process.env.PUBLIC_URL + '/welcome.gif'} 
        alt="Welcome Animation" 
        className="welcome-gif"
      />

      {/* About Section */}
      <div className="about-section">
        <h3>About</h3>
        <p>
        This system helps collectors plan the most efficient routes when visiting multiple debtors in a day.
          By visualizing hotspots and using optimized routing, it saves time and improves productivity in the field.
        </p>
      </div>

      {/* Cards Section */}
      <div className="card-section">
        <div className="card">
          <h4>Smart Routing</h4>
          <p>Automatically find the best path to visit all your destinations with minimal travel time.</p>
        </div>
        <div className="card">
          <h4>Visual Mapping</h4>
          <p>Use interactive maps to view locations, start points, and traffic data visually.</p>
        </div>
        <div className="card">
        <h4>Productivity Boost</h4>
        <p>Spend less time on the road and more time connecting with clients.</p>
        </div>
      </div>

      
    </div>
  );
}

export default Home;
