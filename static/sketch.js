/*
{
  "y": 40.7328569,
  "x": -73.9959291,
  "highway": "traffic_signals",
  "street_count": 4,
  "id": 42421877
}
*/
class Node {
  constructor (data) {
    this._data = data;
    this.lon = data.x;
    this.lat = data.y;
    this.highway = data.highway;
    this.streetCount = data.street_count;
    this.id = data.id;
    
    this.x = null;
    this.y = null;
  }
  
  project (mapX, mapY) {
    this.x = mapX(this.lon);
    this.y = mapY(this.lat);
  }
  
  draw (p) {
    p.ellipse(this.x, this.y, 5, 5);
  }
}

/*
{
  "osmid": [
    5668989,
    1032454983
  ],
  "oneway": true,
  "lanes": [
    "1",
    "2"
  ],
  "name": "West 9th Street",
  "highway": "residential",
  "maxspeed": "25 mph",
  "reversed": false,
  "length": 311.336,
  "geometry": "[[-73.9959291, 40.7328569], [-73.9960265, 40.7328958], [-73.9987019, 40.7340344], [-73.9989395, 40.7341355], [-73.9990171, 40.7341483], [-73.9991816, 40.7341463]]",
  "source": 42421877,
  "target": 42421889,
  "key": 0
}
*/
class Link {
  constructor (data) {
    this._data = data;
    this.geometry = null;
    this.pts = null;
  }
  
  project (mapX, mapY, nodes) {
    if (this._data.geometry) {
      this.geometry = JSON.parse(this._data.geometry);
    } else {
      const sourceNode = nodes[this._data.source];
      const targetNode = nodes[this._data.target];
    
      if (sourceNode && targetNode) {
        const sourcePt = [sourceNode.x, sourceNode.y];
        const targetPt = [targetNode.x, targetNode.y];

        this.geometry = [sourcePt, targetPt];
      } else {
        this.geometry = [];
      }
    }

    this.pts = this.geometry.map(pt => ({ x: mapX(pt[0]), y: mapY(pt[1]) }));
  }
  
  draw (p) {
    p.beginShape();
    for (const pt of this.pts) {
      p.vertex(pt.x, pt.y);
    }
    p.endShape();
  }
}

const sketch = p => {
  let graphData = null;
  const latlonRange = { minLon: null, maxLon: null, minLat: null, maxLat: null};

  const nodes = {};
  const links = [];
  
  p.setup = () => {
    const eltSize = getCanvasSize();
    p.createCanvas(eltSize.width, eltSize.height);
  
    // p.noLoop();

    p.strokeWeight(2);
    p.noFill();
    p.background(p.color('white'));
    
    // Set up stuff here.
    const input = document.getElementById('placeInput');
    
    input.addEventListener('keydown', function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        
        fetch("/graph?place=" + encodeURIComponent(input.value))
          .then(response => response.json())
          .then(data => {
            registerNewGraphData(data);
          })
          .catch(error => {
            const responseDiv = document.getElementById('response');
            responseDiv.textContent = "Error: " + error;
          });
      }
    });
  };
  
  const mapX = lon => {
    // return p.map(lon, latlonRange.minLon, latlonRange.maxLon, 0, p.width);
    return (lon * latlonRange.compensationFactor - latlonRange.minLon * latlonRange.compensationFactor) * latlonRange.xScale + latlonRange.xOffset;
  }
  
  const mapY = lat => {
    // return p.map(lat, latlonRange.minLat, latlonRange.maxLat, 0, p.height);
    // Invert Y since screen coordinates go top to bottom, but latitudes go from bottom (south) to top (north)
    return p.height - ((lat - latlonRange.minLat) * latlonRange.yScale + latlonRange.yOffset);
  }
  
  const registerNewGraphData = data => {
    graphData = JSON.parse(data.data.graph);
    console.log(graphData);
    
    let minX = latlonRange.minLon || 10000000;
    let maxX = latlonRange.maxLon || -10000000;
    let minY = latlonRange.minLat || 10000000;
    let maxY = latlonRange.maxLat || -10000000;

    for (const node of graphData.nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
      
      const newNode = new Node(node);
      nodes[newNode.id] = newNode;
    }
    
    latlonRange.minLon = minX;
    latlonRange.maxLon = maxX;
    latlonRange.minLat = minY;
    latlonRange.maxLat = maxY;
    
    const middleLat = (latlonRange.minLat + latlonRange.maxLat) / 2;
    latlonRange.compensationFactor = Math.cos(middleLat * Math.PI / 180);

    const bboxAspectRatio = (latlonRange.maxLon * latlonRange.compensationFactor - latlonRange.minLon * latlonRange.compensationFactor) / (latlonRange.maxLat - latlonRange.minLat);
    const screenAspectRatio = p.width / p.height;
    
    let xScale, yScale, xOffset, yOffset, scaledWidth, scaledHeight;
    
    if (bboxAspectRatio > screenAspectRatio) {
        // Width is the constraining dimension
        scaledWidth = p.width;
        scaledHeight = p.width / bboxAspectRatio;
    
        xOffset = 0;
        yOffset = (p.height - scaledHeight) / 2;
    } else {
        // Height is the constraining dimension
        scaledHeight = p.height;
        scaledWidth = p.height * bboxAspectRatio;
    
        yOffset = 0;
        xOffset = (p.width - scaledWidth) / 2;
    }
    
    xScale = scaledWidth / (latlonRange.maxLon * latlonRange.compensationFactor - latlonRange.minLon * latlonRange.compensationFactor);
    yScale = scaledHeight / (latlonRange.maxLat - latlonRange.minLat);

    latlonRange.scaledWidth = scaledWidth;
    latlonRange.scaledHeight = scaledHeight;
    latlonRange.xOffset = xOffset;
    latlonRange.yOffset = yOffset;
    latlonRange.xScale = xScale;
    latlonRange.yScale = yScale;

    // Compute all the projected x, y coordinates for each node.
    for (const key in nodes) {
      const node = nodes[key];
      node.project(mapX, mapY);
    }
    
    // Parse all the edges of the graph, called 'links.'
    for (const link of graphData.links) {
      const newLink = new Link(link);
      links.push(newLink);
    }
    
    for (const link of links) {
      link.project(mapX, mapY, nodes);
    }
  }
  
  p.draw = () => {
    p.background(p.color('white'));
    
    for (const key in nodes) {
      const node = nodes[key];
      node.draw(p);
    }
    
    for (const link of links) {
      link.draw(p);
    }
  };
  
  // p.mouseMoved = () => {
  //   p.redraw();
  // };
  // 
  // p.mouseDragged = () => {
  //   p.redraw();
  // };
  // 
  // // Only animate if the user's mouse cursor is inside the sketch.
  // p.mouseMoved = () => {
  //   if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
  //     p.loop();
  //   } else {
  //     p.noLoop();
  //   }
  // }

  // Resize the sketch if the window changes size.
  p.windowResized = () => {
    const eltSize = getCanvasSize();
    p.resizeCanvas(eltSize.width, eltSize.height);
  }
  
  // p.mouseWheel = event => {
  //   latlonRange.scaleX += event.delta / 10;
  //   latlonRange.scaleY += event.delta / 10;
  // }
}

function getHostElement () {
  return document.getElementById('sketch');
}

function getCanvasSize () {
  const host = getHostElement();
  if (!host) {
    console.warn("Hmm, couldn't find the host element.");
    return { width: 800, height: 400 };
  };
  const rect = host.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function onReady () {
  const host = getHostElement();
  new p5(sketch, host);
}

if (document.readyState === 'complete') {
  onReady();
} else {
  document.addEventListener("DOMContentLoaded", onReady);
}
