from flask import Flask, request, jsonify
import math
from flask_cors import CORS


app = Flask(__name__)
CORS(app)


# Heuristic function (Euclidean distance)
def heuristic(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

# A* Algorithm for pathfinding
def a_star(start, destinations):
    start = tuple(start)
    destinations = [tuple(dest) for dest in destinations]

    open_set = [start]
    came_from = {}
    g_score = {start: 0}
    f_score = {start: heuristic(start, destinations[0])}

    while open_set:
        current = min(open_set, key=lambda x: f_score.get(x, float('inf')))
        open_set.remove(current)

        if current == destinations[0]:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            return path[::-1]

        neighbors = [dest for dest in destinations if dest != current]
        for neighbor in neighbors:
            tentative_g_score = g_score.get(current, float('inf')) + heuristic(current, neighbor)
            if tentative_g_score < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic(neighbor, destinations[0])
                if neighbor not in open_set:
                    open_set.append(neighbor)

    return []

@app.route('/optimize', methods=['POST'])
def optimize_route():
    data = request.get_json()
    start = data.get('start')
    destinations = data.get('destinations')

    if not start or not destinations:
        return jsonify({"error": "Start and destinations are required"}), 400

    # Find the optimized route using A* algorithm
    optimized_route = a_star(start, destinations)

    if not optimized_route:
        return jsonify({"error": "No path found"}), 404

    return jsonify({"optimizedRoute": optimized_route})

if __name__ == '__main__':
    app.run(debug=True)
