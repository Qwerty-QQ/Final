# filename: app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import osmnx as ox
import networkx as nx
import itertools
from math import radians, sin, cos, sqrt, atan2

app = Flask(__name__)
CORS(app)

# 🔁 Load Iligan City road network once at startup
ox.settings.use_cache = False
print("Loading Iligan City road network...")
try:
    G = ox.graph_from_place("Iligan, Lanao del Norte, Philippines", network_type="drive")
    print("Loaded graph from place.")
except Exception as e:
    print("graph_from_place failed:", e)
    print("Fallback: using bounding box.")
    bbox = (8.27, 8.13, 124.32, 124.18)  # north, south, east, west
    G = ox.graph_from_bbox(bbox=bbox, network_type='drive')

G = G.to_undirected()
print(f"Graph loaded with {len(G.nodes)} nodes and {len(G.edges)} edges.")

# 🔠 Add travel_time to each edge (used by A*)
for u, v, k, data in G.edges(keys=True, data=True):
    speed_kph = data.get("speed_kph", 60)  # fallback if missing
    length_km = data["length"] / 1000
    travel_time_hr = length_km / speed_kph
    data["travel_time"] = travel_time_hr

# 🧠 Haversine formula (in kilometers)
def haversine(coord1, coord2):
    R = 6371  # Earth radius in km
    lat1, lon1 = map(radians, coord1)
    lat2, lon2 = map(radians, coord2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

# 🧳️ Find nearest node in the road graph
def get_nearest_node(coord):
    return ox.distance.nearest_nodes(G, X=coord[1], Y=coord[0])

# 🚣️ Get path between two coords using specified method
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
            ) / 50,  # heuristic in hours (assuming ~50km/h)
            weight='travel_time'
        )
    else:
        raise ValueError("Unknown routing method")

    return [(G.nodes[n]['y'], G.nodes[n]['x']) for n in path]

# 📡 POST /route — Show routes between ordered destinations (Dijkstra)
@app.route('/route', methods=['POST'])
def route_ordered():
    data = request.get_json()
    start = data.get('start')
    destinations = data.get('destinations')

    if not start or not destinations:
        return jsonify({"error": "Start and destinations are required"}), 400

    try:
        full_route = []
        current = start
        for dest in destinations:
            segment = get_route_path(current, dest, method="dijkstra")
            if full_route:
                full_route.extend(segment[1:])
            else:
                full_route.extend(segment)
            current = dest
        return jsonify({"route": full_route})
    except Exception as e:
        print("Dijkstra routing error:", e)
        return jsonify({"error": str(e)}), 500

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

# 📡 POST /optimize — Optimize using A* with travel_time heuristic
@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.get_json()
    start = tuple(data.get('start'))
    destinations = [tuple(d) for d in data.get('destinations')]

    if not start or not destinations:
        return jsonify({"error": "Start and destinations are required"}), 400

    best_order = None
    best_path = []
    shortest_time = float('inf')

    for perm in itertools.permutations(destinations):
        total_path = []
        total_time = 0
        current = start

        try:
            for dest in perm:
                segment_nodes = nx.astar_path(
                    G,
                    get_nearest_node(current),
                    get_nearest_node(dest),
                    heuristic=lambda a, b: haversine(
                        (G.nodes[a]['y'], G.nodes[a]['x']),
                        (G.nodes[b]['y'], G.nodes[b]['x'])
                    ) / 50,  # estimated speed 50km/h
                    weight='travel_time'
                )
                if not segment_nodes:  # Check if the A* path is empty
                    continue

                segment_coords = [(G.nodes[n]['y'], G.nodes[n]['x']) for n in segment_nodes]

                segment_time = sum(
                    G[u][v][0].get("travel_time", 0)
                    for u, v in zip(segment_nodes[:-1], segment_nodes[1:])
                )

                total_time += segment_time
                if total_path:
                    total_path.extend(segment_coords[1:])
                else:
                    total_path.extend(segment_coords)

                current = dest

            if total_time < shortest_time:
                shortest_time = total_time
                best_order = perm
                best_path = total_path

        except Exception as e:
            print(f"A* error on path {perm}: {e}")

    if not best_path:
        return jsonify({"error": "No route found"}), 400

    return jsonify({
        "optimizedRoute": best_path,
        "bestOrder": best_order,
        "totalTime": shortest_time
        })

# 🚀 Run Flask app
if __name__ == '__main__':
    app.run(debug=True)
