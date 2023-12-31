"""Serves a simple webpage to enter a 'place' for OpenStreetMap and get a cleaned graph."""

# Uses https://pypi.org/project/osmnx/
# This was a pain to get working because some object in a dependency, shapely.geometry.linestring.LineString
# can't be serialized into JSON automatically, so I had to write a function to do so.

from flask import Flask, jsonify, request, send_from_directory, current_app
import osmnx as ox
import networkx as nx
import json
import shapely

# OSMNX Settings Module
# https://osmnx.readthedocs.io/en/stable/internals-reference.html#osmnx-settings-module

# Disable the cache for Google App Engine.
ox.settings.use_cache = False
# This could also be setting the cache folder to /tmp, but that would take memory.
# https://cloud.google.com/appengine/docs/standard/using-temp-files?tab=python
ox.settings.cache_folder = "/tmp"

app = Flask(__name__)

def line_string_json(line_str_obj):
    """Given a LineString object from shapely, return a JSON-friendly representation."""
    x, y = line_str_obj.coords.xy
    points = list(zip(x, y))
    return json.dumps(points)

graph_to_json = lambda o: line_string_json(o) if isinstance(o, shapely.geometry.linestring.LineString) else o.__dict__

@app.route('/graph', methods=['GET'])
def graph():
    place = request.args.get('place')
    
    if not place:
        return jsonify({'error': 'Place parameter is missing.'}), 400

    G = ox.graph_from_place(place, network_type="drive")
    d = nx.json_graph.node_link_data(G)

    response_data = {
        'data': {
            'place_received': place,
            'graph': json.dumps(d, default=graph_to_json)
        }
    }
    
    return jsonify(response_data)

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/')
def default():
    return current_app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
