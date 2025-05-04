import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';

const RoutingMachine = ({ waypoints }) => {
  const map = useMap();
  const controlsRef = useRef([]);
  const polylinesRef = useRef([]);

  useEffect(() => {
    console.log('Waypoints:', waypoints); // Log the waypoints
    if (!map || !Array.isArray(waypoints) || waypoints.length < 2) return;

    const accessToken = 'pk.eyJ1IjoiY2N4MTQyOSIsImEiOiJjbWE3eWp4d3kwajQyMmxwdGpka3NoaGZtIn0.dFehqYfPUQa6jGJIixWWig';
    const altColors = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8'];

    const [start] = waypoints;
    const destinations = waypoints.slice(1);

    // Clear old routing controls and polylines
    controlsRef.current.forEach(control => map.removeControl(control));
    polylinesRef.current.forEach(polyline => map.removeLayer(polyline));
    controlsRef.current = [];
    polylinesRef.current = [];

    // Create routing controls and polylines for each destination
    destinations.forEach((destination, destIndex) => {
      const control = L.Routing.control({
        waypoints: [L.latLng(start[0], start[1]), L.latLng(destination[0], destination[1])],
        router: L.Routing.mapbox(accessToken, {
          profile: 'mapbox/driving',
          alternatives: true,
        }),
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        show: false,
        createMarker: () => null,
      }).addTo(map);

      controlsRef.current.push(control);

      control.on('routesfound', function (event) {
        event.routes.forEach((route, routeIndex) => {
          const color = altColors[(destIndex + routeIndex) % altColors.length];
          const polyline = L.polyline(route.coordinates, {
            color,
            weight: 5,
            opacity: 0.8,
            dashArray: routeIndex === 0 ? null : '6,8',
          }).addTo(map);

          polylinesRef.current.push(polyline);
        });
      });
    });

    // Cleanup
    return () => {
      controlsRef.current.forEach(control => map.removeControl(control));
      polylinesRef.current.forEach(polyline => map.removeLayer(polyline));
      controlsRef.current = [];
      polylinesRef.current = [];
    };
  }, [map, waypoints]);

  return null;
};

export default RoutingMachine;
