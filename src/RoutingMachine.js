import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

const RoutingMachine = ({ waypoints }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) return;

    // Remove previous route control if exists
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    // Define a set of colors for the alternative routes
    const altColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#FF9133'];

    // Ensure alternatives are enabled for multiple routes
    const control = L.Routing.control({
      waypoints: waypoints.map(point => L.latLng(point[0], point[1])),
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      createMarker: () => null,
      alternatives: true, // Allow multiple alternative routes
      lineOptions: {
        styles: [{ color: 'blue', weight: 4 }] // Primary route color
      },
      altLineOptions: (index) => ({
        styles: [{ color: altColors[index % altColors.length], weight: 4 }] // Cycle through the alternative colors
      })
    }).addTo(map);

    routingControlRef.current = control;

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
