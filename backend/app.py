import logging
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import osmnx as ox
import networkx as nx
import itertools
from math import radians, sin, cos, sqrt, atan2
from functools import lru_cache

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load Iligan City road network once at startup
ox.settings.use_cache = True
logger.info("Loading Iligan City road network...")
try:
    G = ox.graph_from_place("Iligan, Lanao del Norte, Philippines", network_type="drive")
    logger.info("Loaded graph from place.")
except Exception as e:
    logger.warning("graph_from_place failed: %s", e)
    logger.info("Fallback: using bounding box.")
    bbox = (8.27, 8.13, 124.32, 124.18)  # north, south, east, west
    G = ox.graph_from_bbox(bbox=bbox, network_type='drive')

G = G.to_undirected()
logger.info("Graph loaded with %d nodes and %d edges.", len(G.nodes), len(G.edges))

# Add travel_time to each edge
for u, v, k, data in G.edges(keys=True, data=True):
    speed_kph = data.get("speed_kph", 60)
    length_km = data["length"] / 1000
    travel_time_hr = length_km / speed_kph
    data["travel_time"] = travel_time_hr

# Haversine formula (in kilometers)
def haversine(coord1, coord2):
    R = 6371
    lat1, lon1 = map(radians, coord1)
    lat2, lon2 = map(radians, coord2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

# Nearest node cache
@lru_cache(maxsize=1024)
def get_nearest_node(coord):
    return ox.distance.nearest_nodes(G, X=coord[1], Y=coord[0])

def get_route_path(start, end, method="dijkstra"):
    start_node = get_nearest_node(start)
    end_node = get_nearest_node(end)

    if method == "dijkstra":
        path = nx.dijkstra_path(G, start_node, end_node, weight='length')
    elif method == "astar":
        path = nx.astar_path(
            G,
            start_node,
            end_node,
            heuristic=lambda a, b: haversine(
                (G.nodes[a]['y'], G.nodes[a]['x']),
                (G.nodes[b]['y'], G.nodes[b]['x'])
            ) / 50,
            weight='travel_time'
        )
    else:
        raise ValueError("Unknown routing method")

    return [(G.nodes[n]['y'], G.nodes[n]['x']) for n in path]

@app.route('/route', methods=['POST'])
def route_all_possible():
    data = request.get_json()
    start = tuple(data.get('start'))
    destinations = [tuple(d) for d in data.get('destinations')]

    if not start or not destinations:
        return jsonify({"error": "Start and destinations are required"}), 400

    results = []

    for perm in itertools.permutations(destinations):
        try:
            route = []
            arrival_times = []
            total_time = 0
            current = start

            for dest in perm:
                nodes = nx.dijkstra_path(
                    G,
                    get_nearest_node(current),
                    get_nearest_node(dest),
                    weight='length'
                )
                segment_coords = [(G.nodes[n]['y'], G.nodes[n]['x']) for n in nodes]
                segment_time = sum(
                    G[u][v][0].get("travel_time", 0)
                    for u, v in zip(nodes[:-1], nodes[1:])
                )
                total_time += segment_time
                arrival_times.append(total_time)

                if route:
                    route.extend(segment_coords[1:])
                else:
                    route.extend(segment_coords)

                current = dest

            results.append({
                "order": perm,
                "path": route,
                "arrival_times": arrival_times,
                "total_time": total_time
            })
        except Exception as e:
            logger.warning("Error processing permutation %s: %s", perm, e)

    if not results:
        return jsonify({"error": "No valid routes found"}), 400

    return jsonify({"routes": results})

@app.route('/nearest', methods=['POST'])
def nearest_debug():
    data = request.get_json()
    try:
        latlng = tuple(data["point"])
        node = get_nearest_node(latlng)
        return jsonify({"nearest_node": node})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/snap', methods=['POST'])
def snap_point():
    data = request.get_json()
    try:
        point = tuple(data["point"])
        node = get_nearest_node(point)
        snapped = (G.nodes[node]['y'], G.nodes[node]['x'])
        return jsonify({"snapped": snapped})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/optimize', methods=['POST'])
@cross_origin(origin='*')
def optimize_route():
    data = request.get_json()
    start = tuple(data.get('start'))
    destinations = [tuple(d) for d in data.get('destinations')]

    if not start or not destinations:
        return jsonify({"error": "Start and destinations are required"}), 400

    best_order = None
    best_path = []
    best_arrival_times = []
    shortest_time = float('inf')

    for perm in itertools.permutations(destinations):
        total_path = []
        arrival_times = []
        total_time = 0
        current = start

        try:
            for dest in perm:
                nodes = nx.astar_path(
                    G,
                    get_nearest_node(current),
                    get_nearest_node(dest),
                    heuristic=lambda a, b: haversine(
                        (G.nodes[a]['y'], G.nodes[a]['x']),
                        (G.nodes[b]['y'], G.nodes[b]['x'])
                    ) / 60.0,
                    weight='travel_time'
                )
                segment_coords = [(G.nodes[n]['y'], G.nodes[n]['x']) for n in nodes]
                segment_time = sum(
                    G[u][v][0].get("travel_time", 0)
                    for u, v in zip(nodes[:-1], nodes[1:])
                )
                total_time += segment_time
                arrival_times.append(total_time)

                if total_path:
                    total_path.extend(segment_coords[1:])
                else:
                    total_path.extend(segment_coords)

                current = dest

            if total_time < shortest_time:
                shortest_time = total_time
                best_order = perm
                best_path = total_path
                best_arrival_times = arrival_times

        except Exception as e:
            logger.warning("A* error on permutation %s: %s", perm, e)

    if not best_path:
        return jsonify({"error": "No valid optimized route found"}), 400

    return jsonify({
        "optimizedRoute": best_path,
        "bestOrder": best_order,
        "arrival_times": best_arrival_times,
        "totalTime": shortest_time
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
