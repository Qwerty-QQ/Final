import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import iliganData from './iliganmap.json';
import "./all2.css";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import RoutingMachine from './RoutingMachine';

// Define icons for start and destination
const startIcon = L.icon({
  iconUrl: process.env.PUBLIC_URL + '/start.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const destIcon = L.icon({
  iconUrl: process.env.PUBLIC_URL + '/dest.png',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const initialPosition = [8.228, 124.245];
const HIGHLIGHTED_BARANGAYS = ['BAGONG SILANG', 'TIBANGA', 'SAN MIGUEL', 'SANTIAGO', 'HINAPLANON', 'SANTO ROSARIO', 'DEL CARMEN', 'LUINAB', 'SAN ROQUE', 'UPPER HINAPLANON', 'SANTA FILOMENA'];

const normalizeString = (str) => str?.toUpperCase().trim();
const shouldHighlight = (barangay) => HIGHLIGHTED_BARANGAYS.includes(normalizeString(barangay));

function ClickHandler({ onMapClick, onRightClick }) {
  useMapEvents({
    click(e) {
      onMapClick && onMapClick([e.latlng.lat, e.latlng.lng]);
    },
    contextmenu(e) {
      onRightClick && onRightClick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}




const MapPage = () => {
  const [trafficData, setTrafficData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [start, setStart] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [routeCoords, setRouteCoords] = useState([]);

  const handleLeftClick = (latlng) => {
    // Optional: allow left click to reset or ignore
  };
  
  const handleRightClick = (latlng) => {
    if (!start) {
      setStart(latlng);
    } else {
      setDestinations(prev => [...prev, latlng]);
    }
  };

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

  const styleFeature = feature => {
    const name = normalizeString(feature.properties.adm4_en);
    if (!shouldHighlight(name)) return { fillColor: 'transparent', weight: 0, fillOpacity: 0 };
    return {
      fillColor: getColor(getTrafficCount(name)),
      weight: 1,
      color: 'gray',
      fillOpacity: 0.7
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

  const handleOptimize = async () => {
    if (!start || destinations.length === 0) return;

    const response = await fetch('http://localhost:5000/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: start,
        destinations: destinations
      })
    });

    const data = await response.json();

    if (response.ok) {
      setRouteCoords(data.optimizedRoute);
    } else {
      alert("Error: " + data.error);
    }
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setStart([latitude, longitude]);
      },
      (error) => {
        alert("Unable to retrieve your location.");
        console.error(error);
      }
    );
  };

  const filteredGeoJson = {
    ...iliganData,
    features: iliganData.features.filter(f => shouldHighlight(f.properties.adm4_en))
  };

  return (
    <div className="map-page">
      <div className="map-controls">
        <button onClick={handleRoute} disabled={!start || destinations.length === 0}>Route</button>
        <button onClick={handleOptimize} disabled={!start || destinations.length === 0}>Optimize</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={detectCurrentLocation}>Use My Location</button>
      </div>
      <div className="map-container">
        <MapContainer center={initialPosition} zoom={14} style={{ height: '100%', width: '100%' }}>
          <ClickHandler onMapClick={handleLeftClick} onRightClick={handleRightClick} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {!isLoading && <GeoJSON data={filteredGeoJson} style={styleFeature} onEachFeature={onEachFeature} />}
          {start &&
            <Marker position={start} icon={startIcon}>
              <Popup>Start Point</Popup>
            </Marker>
          }
          {destinations.map((d, i) =>
            <Marker key={i} position={d} icon={destIcon}>
              <Popup>Destination {i + 1}</Popup>
            </Marker>
          )}
          {routeCoords.length > 1 && <RoutingMachine waypoints={routeCoords} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
