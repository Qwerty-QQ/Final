import React, { useState } from 'react';
import './Sidebar.css';
import { FaBars, FaTimes } from 'react-icons/fa';

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>

      {/* Toggle button directly below the header */}
      <div className="toggle-container">
        <button className="toggle-button" onClick={toggleSidebar}>
          {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="Map">Map</a></li>
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
