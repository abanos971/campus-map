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

    const mapEl = document.getElementById("map"); // change if your div id is different
    console.log("mapEl found?", !!mapEl);

    ["pointerdown","touchstart","click"].forEach(evt => {
      mapEl?.addEventListener(evt, (e) => {
        console.log("MAP EVENT:", evt, {
          x: e.clientX,
          y: e.clientY,
          target: e.target?.tagName,
        });
      }, { passive: false });
    });

    ["pointerdown","touchstart","click"].forEach(evt => {
      window.addEventListener(evt, () => console.log("WINDOW EVENT:", evt), { passive: true });
    });

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
      const TOUCH_TAP_TOLERANCE_PX = 10;
      let touchStartPoint = null;
      let suppressNextClick = false;
      let markerDialogOpen = false;

      const openMarkerNameDialog = (initialValue = 'New Location') => {
        if (markerDialogOpen) {
          return Promise.resolve(null);
        }

        markerDialogOpen = true;

        return new Promise((resolve) => {
          const overlay = document.createElement('div');
          overlay.className = 'marker-name-overlay';

          const dialog = document.createElement('div');
          dialog.className = 'marker-name-dialog';

          const title = document.createElement('h2');
          title.textContent = 'Name this location';

          const input = document.createElement('input');
          input.type = 'text';
          input.value = initialValue;
          input.placeholder = 'Enter location name';
          input.className = 'marker-name-input';
          input.maxLength = 60;

          const actions = document.createElement('div');
          actions.className = 'marker-name-actions';

          const cancelButton = document.createElement('button');
          cancelButton.type = 'button';
          cancelButton.className = 'marker-name-cancel';
          cancelButton.textContent = 'Cancel';

          const saveButton = document.createElement('button');
          saveButton.type = 'button';
          saveButton.className = 'marker-name-save';
          saveButton.textContent = 'Save';

          actions.appendChild(cancelButton);
          actions.appendChild(saveButton);

          dialog.appendChild(title);
          dialog.appendChild(input);
          dialog.appendChild(actions);
          overlay.appendChild(dialog);
          document.body.appendChild(overlay);

          const closeDialog = (value) => {
            overlay.remove();
            markerDialogOpen = false;
            resolve(value);
          };

          cancelButton.addEventListener('click', () => closeDialog(null));
          saveButton.addEventListener('click', () => closeDialog(input.value.trim()));

          overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
              closeDialog(null);
            }
          });

          input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              closeDialog(input.value.trim());
            } else if (event.key === 'Escape') {
              event.preventDefault();
              closeDialog(null);
            }
          });

          window.setTimeout(() => input.focus(), 0);
        });
      };

      const addMarkerAt = async (coordinates) => {
        const markerText = await openMarkerNameDialog('New Location');
        if (markerText === null) {
          return;
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
      };

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
        if (suppressNextClick) {
          suppressNextClick = false;
          return;
        }
        void addMarkerAt(e.lngLat);
      });

      // Touchscreens: add marker only for a tap (not for drag/pinch gestures).
      map.on('touchstart', (e) => {
        if (!e.point) {
          touchStartPoint = null;
          return;
        }
        touchStartPoint = { x: e.point.x, y: e.point.y };
      });

      map.on('touchend', (e) => {
        if (!touchStartPoint || !e.point) {
          touchStartPoint = null;
          return;
        }

        const dx = e.point.x - touchStartPoint.x;
        const dy = e.point.y - touchStartPoint.y;
        const isTap = Math.hypot(dx, dy) <= TOUCH_TAP_TOLERANCE_PX;

        touchStartPoint = null;

        if (isTap) {
          suppressNextClick = true;
          void addMarkerAt(e.lngLat);
        }
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
