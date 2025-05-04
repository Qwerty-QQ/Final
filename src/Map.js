import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import iliGeoJSON from './ili.geojson';  // Import the new GeoJSON file
import "./all2.css";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import RoutingMachine from './RoutingMachine';

// Define icons for start and destination
const startIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div class="marker-label">Rider</div><img src="${process.env.PUBLIC_URL}/start.png" class="marker-img" />`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});


const destIcon = L.icon({
  iconUrl: process.env.PUBLIC_URL + '/dest.png',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const initialPosition = [8.228, 124.245];
const HIGHLIGHTED_BARANGAYS = ['BAGONG SILANG', 'TIBANGA', 'SAN MIGUEL', 'SANTIAGO', 'HINAPLANON', 'SANTO ROSARIO', 'DEL CARMEN', 'LUINAB', 'UPPER HINAPLANON', 'PALA-O', 'VILLA VERDE', 'SARAY', 'POBLACION'];

const normalizeString = (str) => str?.toUpperCase().trim();
const shouldHighlight = (barangay) => HIGHLIGHTED_BARANGAYS.includes(normalizeString(barangay));

function ClickHandler({ onMapClick, onRightClick }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick && onMapClick([e.latlng.lat, e.latlng.lng]);
    },
    contextmenu(e) {
      if (onRightClick) {
        const containerPoint = map.latLngToContainerPoint(e.latlng);
        onRightClick([e.latlng.lat, e.latlng.lng], containerPoint);
      }
    },
  });

  return null;
}


const MapPage = () => {
  const [trafficData, setTrafficData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [start, setStart] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);
  const [rightClickPos, setRightClickPos] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'start' or 'destination'
  const [contextMenuPos, setContextMenuPos] = useState(null); // screen position
  const [showLabelModal, setShowLabelModal] = useState(false);


  const handleLeftClick = (latlng) => {
    // Optional: allow left click to reset or ignore
  };

  const handleRightClick = (latlng, screenPos) => {
    setRightClickPos(latlng);
    setContextMenuPos([screenPos.x, screenPos.y]);
    setShowContextMenu(true);
  };
  

  const handleLabelInput = (actionType) => {
    setPendingAction(actionType);
    setLabelInput('');
    setShowLabelModal(true);
  };
  
  const isValidCoords = (coords) => 
  Array.isArray(coords) && coords.length === 2 && coords.every(n => typeof n === 'number' && !isNaN(n));

  const handleLabelSubmit = async () => {
    if (!labelInput.trim()) return;
  
    // Debugging logs
    console.log("Original rightClickPos:", rightClickPos);
    console.log("Pending Action:", pendingAction);
  
    // TEMP: Bypass snapping to check if marker appears correctly
    // const snapped = await snapPointToRoad(rightClickPos);
    const snapped = rightClickPos;
  
    console.log("Snapped position:", snapped);
  
    if (pendingAction === 'start') {
      setStart({ position: snapped, label: labelInput });
    } else {
      setDestinations(prev => [...prev, { position: snapped, label: labelInput }]);
    }
  
    setShowLabelModal(false);
    setPendingAction(null);
    setShowContextMenu(false); // HIDE CONTEXT MENU
  };
  
  
  
  
  useEffect(() => {
    const hideMenu = () => setShowContextMenu(false);
    window.addEventListener('click', hideMenu);
    return () => window.removeEventListener('click', hideMenu);
  }, []);

  
  useEffect(() => {
    const fetchTrafficData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "records"));
        const aggregated = snapshot.docs.reduce((acc, doc) => {
          const place = normalizeString(doc.data().placeOfViolation);
          if (place && shouldHighlight(place)) acc[place] = (acc[place] || 0) + 1;
          return acc;
        }, {});
        setTrafficData(Object.entries(aggregated).map(([barangay, count]) => ({ barangay, count })));
        setIsLoading(false);
      } catch (e) {
        console.error(e);
      }
    };
    fetchTrafficData();
  }, []);

  const getTrafficCount = (name) => {
    const found = trafficData.find(d => normalizeString(d.barangay) === normalizeString(name));
    return found ? found.count : 0;
  };

  const getColor = (count) => {
    if (count > 50) return '#800026';
    if (count > 30) return '#BD0026';
    if (count > 10) return '#E31A1C';
    if (count > 5) return '#FC4E2A';
    if (count > 0) return '#FEB24C';
    return '#FFEDA0';
  };

  // 👉 UPDATED styleFeature: use polyline style
  const styleFeature = feature => {
    const name = normalizeString(feature.properties.adm4_en);
    if (!shouldHighlight(name)) return { weight: 0, opacity: 0 }; // Hide non-highlighted
    return {
      fillOpacity: 0,          // No fill color
      color: 'black',          // Border color
      weight: 1,               // Border thickness
      opacity: 1,              // Border opacity
    };
  };

  const onEachFeature = (feature, layer) => {
    const name = normalizeString(feature.properties.adm4_en);
    if (!shouldHighlight(name)) return;
  };

  const handleMapClick = (latlng) => {
    if (!start) setStart(latlng);
    else setDestinations(prev => [...prev, latlng]);
  };

  const handleRoute = () => {
    if (!start || destinations.length === 0) return;
    setRouteCoords([start, ...destinations]);
  };

  const handleReset = () => {
    setStart(null);
    setDestinations([]);
    setRouteCoords([]);
  };

  const snapPointToRoad = async (point) => {
    try {
      const res = await fetch("http://localhost:5000/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ point }),
      });
      const data = await res.json();
      return data.snapped || point; // fallback if snap fails
    } catch (err) {
      console.error("Snap error:", err);
      return point;
    }
  };
  
  
  
  const handleOptimize = async () => {
    if (!start || destinations.length === 0) return;
  
    try {
      const response = await fetch('http://localhost:5000/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, destinations })
      });
  
      const text = await response.text(); // get raw response
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON response: " + text);
      }
  
      console.log("Optimize response:", data);
  
      if (response.ok && data.optimizedRoute?.length > 1) {
        setRouteCoords(data.optimizedRoute);
      } else {
        alert("Error: " + (data.error || "No route returned or malformed response"));
      }
    } catch (error) {
      console.error("Optimize fetch failed:", error);
      alert("Failed to fetch optimized route.");
    }
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const snapped = await snapPointToRoad([latitude, longitude]);
        setStart(snapped);
      },
      (error) => {
        alert("Unable to retrieve your location.");
        console.error(error);
      }
    );
  };
  
  const filteredGeoJson = iliGeoJSON && iliGeoJSON.features ? {
      ...iliGeoJSON,
      features: iliGeoJSON.features.filter(f => shouldHighlight(f.properties.adm4_en))
    } : { features: [] };


    
  
  return (
    <div className="map-page">
      <div className="map-controls">
        <button onClick={handleRoute} disabled={!start || destinations.length === 0}>Route</button>
        <button onClick={handleOptimize} disabled={!start || destinations.length === 0}>Optimize</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={detectCurrentLocation}>Use My Location</button>
      </div>
      {showContextMenu && contextMenuPos && (
          <div
            className="context-menu"
            style={{
              position: 'absolute',
              top: `${contextMenuPos[1]}px`,
              left: `${contextMenuPos[0]}px`,
              zIndex: 1000
            }}
          >
            <button onClick={() => handleLabelInput('start')}>Add as Start</button>
            <button onClick={() => handleLabelInput('destination')}>Add as Destination</button>
          </div>
        )}


      <div className="map-container">
      <MapContainer
          center={initialPosition}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance) => {
            window._leafletMap = mapInstance; // global reference
          }}
        >
          <ClickHandler onMapClick={handleLeftClick} onRightClick={handleRightClick} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {!isLoading && <GeoJSON data={filteredGeoJson} style={styleFeature} onEachFeature={onEachFeature} />}
          {start &&
            <Marker
              position={start.position}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-label">${start.label || 'Rider'}</div><img src="${process.env.PUBLIC_URL}/start.png" class="marker-img" />`,
                iconSize: [24, 32],
                iconAnchor: [12, 32],
              })}
            >
              <Popup>{start.label || 'Start Point'}</Popup>
            </Marker>
          }

          {destinations.map((d, i) =>
            <Marker
              key={i}
              position={d.position}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-label">${d.label || `Destination ${i + 1}`}</div><img src="${process.env.PUBLIC_URL}/dest.png" class="marker-img" />`,
                iconSize: [24, 32],
                iconAnchor: [12, 32],
              })}
            >
              <Popup>{d.label || `Destination ${i + 1}`}</Popup>
            </Marker>
          )}


      {routeCoords.length > 1 && <RoutingMachine waypoints={routeCoords.map(p => p.position || p)} />}        </MapContainer>
        <div className="route-instructions">
          <h3>Route List</h3>
          {routeCoords.length > 1 ? (
            <div className="route-list">
              <ul>
                <div className="route-list1">
                  {routeCoords.slice(1).map((coord, index) => (
                    <li key={index}>
                      Route {index + 1} - {destinations[index].label || `Destination ${index + 1}`}
                    </li>
                  ))}
                </div>
              </ul>
            </div>
          ) : (
            <p>No route selected.</p>
          )}
        </div>


        {showLabelModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Enter Label for {pendingAction === 'start' ? 'Starting Point' : 'Destination'}</h3>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g. School, Home"
                autoFocus
              />
              <div className="modal-buttons">
                <button onClick={handleLabelSubmit}>OK</button>
                <button onClick={() => {
                    setShowLabelModal(false);
                    setShowContextMenu(false); // HIDE CONTEXT MENU
                  }}>Cancel</button>
              </div>
            </div>
          </div>
        )}



      </div>
    </div>
  );
};

export default MapPage;