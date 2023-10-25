# OSMNX tinkering

A couple of projects tinkering with Geoff Boeing's OSMNX library for accessing
and processing OpenStreetMap data, particularly graph networks of streets.

Load the environment first.

> source .env/bin/activate

`intro.py` is a simple request that saves a PDF of a particular 'place' in OSM,
just given the name of the place.

`main.py` does something a bit more. It uses the same library but serves a
webpage and a P5.js sketch that draws the graph.

> python main.py

Then navigate to <http://127.0.0.1:5000/index.html>

I started this on 2023-10-22, and I'm trying to find ways of getting clean OSM
data like what OSMNX produces in the browser, because Python still kinda sucks
at interactive things, but anything JavaScript and data is just painful.

## Development Notes

When adding new modules, make sure to regenerate `requirements.txt`.

> pip freeze > requirements.txt

Google App Engine deployment to project `osmnx-p5js`.

> gcloud app deploy
