import React from 'react';
import './Header.css';

function Header() {
  return (
    <header className="top-header">
      <div className="header-left">
      <img 
          src={process.env.PUBLIC_URL + '/logo.png'} 
          alt="Cooperative Logo" 
          className="header-logo"
        />
        <h1 className="header-title">NMPC Collection Route </h1>
      </div>
      <nav className="header-nav">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/map">Map</a></li>
          <li><a href="/RecordsPage">Records</a></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
