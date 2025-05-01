// RoutingMachine.js
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { useMap } from 'react-leaflet';

const RoutingMachine = ({ waypoints }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || waypoints.length < 2) return;

     // Remove previous routing control if exists
     if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    const control = L.Routing.control({
      waypoints: waypoints.map((point) => L.latLng(point[0], point[1])),
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      createMarker: () => null, // Hides default start/end icons
      lineOptions: {
        styles: [{ color: 'blue', weight: 4 }], // Custom route line
      },
    }).addTo(map);

    routingControlRef.current = control;

     // Clean up on unmount
     return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, waypoints]);

  return null;
};

export default RoutingMachine;
