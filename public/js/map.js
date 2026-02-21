// Fetch Mapbox token from server
async function initializeMap() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    
    if (!config.mapboxToken) {
      alert('Mapbox token not found. Please check your .env file.');
      return;
    }

    mapboxgl.accessToken = config.mapboxToken;

    // Initialize the map
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-96.7265, 32.9757], // Default center (Dallas area)
      zoom: 15,
      attributionControl: false // Hide attribution control
    });

    // GeoJSON feature collection to store markers
    const markers = {
      type: 'FeatureCollection',
      features: []
    };

    // Wait for map to load before adding sources and layers
    map.on('load', () => {
      // Add a source for the markers
      map.addSource('markers', {
        type: 'geojson',
        data: markers
      });

      // Add a circle layer for the markers
      map.addLayer({
        id: 'marker-circles',
        type: 'circle',
        source: 'markers',
        paint: {
          'circle-radius': 12,
          'circle-color': '#007bff',
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Add a text layer for the marker labels
      map.addLayer({
        id: 'marker-text',
        type: 'symbol',
        source: 'markers',
        layout: {
          'text-field': ['get', 'title'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 1
        }
      });

      // Allow users to click on the map to add markers
      map.on('click', (e) => {
        const coordinates = e.lngLat;
        
        // Prompt user for marker text
        const markerText = prompt('Enter marker text:', 'New Location');
        
        if (markerText === null) {
          return; // User cancelled
        }

        // Add marker to GeoJSON
        markers.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [coordinates.lng, coordinates.lat]
          },
          properties: {
            title: markerText || 'Untitled',
            id: Date.now() // Unique ID for the marker
          }
        });

        // Update the data source
        map.getSource('markers').setData(markers);
      });

      // Show cursor change on marker hover
      map.on('mouseenter', 'marker-circles', (e) => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'marker-circles', () => {
        map.getCanvas().style.cursor = '';
      });
    });



  } catch (error) {
    console.error('Error initializing map:', error);
    alert('Error loading map. Please check the console.');
  }
}

// Initialize map when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMap);
} else {
  initializeMap();
}
