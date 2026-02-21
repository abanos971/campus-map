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
      const AMENITY_TYPES = [
        'Restroom',
        'Water Fountain',
        'Elevator',
        'Stairs',
        'Entrance',
        'Study Space',
        'Food',
        'Parking',
        'Accessibility',
        'Other'
      ];
      const TOUCH_TAP_TOLERANCE_PX = 10;
      let touchStartPoint = null;
      let suppressNextClick = false;
      let markerDialogOpen = false;

      const escapeHtml = (value = '') => (
        value
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;')
      );

      const openMarkerFormDialog = () => {
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
          title.textContent = 'Add Amenity';

          const amenityTypeLabel = document.createElement('label');
          amenityTypeLabel.className = 'marker-name-label';
          amenityTypeLabel.textContent = 'Amenity type';

          const amenityTypeSelect = document.createElement('select');
          amenityTypeSelect.className = 'marker-name-input';
          AMENITY_TYPES.forEach((type) => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            amenityTypeSelect.appendChild(option);
          });

          const indoorOutdoorLabel = document.createElement('label');
          indoorOutdoorLabel.className = 'marker-name-label';
          indoorOutdoorLabel.textContent = 'Indoor / Outdoor';

          const indoorOutdoorSelect = document.createElement('select');
          indoorOutdoorSelect.className = 'marker-name-input';
          [
            { value: 'indoor', text: 'Indoor' },
            { value: 'outdoor', text: 'Outdoor' }
          ].forEach((entry) => {
            const option = document.createElement('option');
            option.value = entry.value;
            option.textContent = entry.text;
            indoorOutdoorSelect.appendChild(option);
          });

          const floorWrap = document.createElement('div');
          floorWrap.className = 'marker-name-floor-wrap';

          const floorLabel = document.createElement('label');
          floorLabel.className = 'marker-name-label';
          floorLabel.textContent = 'Floor / level';

          const floorInput = document.createElement('input');
          floorInput.type = 'text';
          floorInput.className = 'marker-name-input';
          floorInput.placeholder = 'e.g. Floor 2';
          floorInput.maxLength = 30;

          floorWrap.appendChild(floorLabel);
          floorWrap.appendChild(floorInput);

          const descriptionLabel = document.createElement('label');
          descriptionLabel.className = 'marker-name-label';
          descriptionLabel.textContent = 'Location description';

          const descriptionInput = document.createElement('textarea');
          descriptionInput.className = 'marker-name-input marker-name-textarea';
          descriptionInput.placeholder = 'Describe where this is relative to nearby places';
          descriptionInput.maxLength = 200;

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

          const updateFloorVisibility = () => {
            floorWrap.style.display = indoorOutdoorSelect.value === 'indoor' ? 'block' : 'none';
          };

          updateFloorVisibility();

          indoorOutdoorSelect.addEventListener('change', updateFloorVisibility);

          dialog.appendChild(title);
          dialog.appendChild(amenityTypeLabel);
          dialog.appendChild(amenityTypeSelect);
          dialog.appendChild(indoorOutdoorLabel);
          dialog.appendChild(indoorOutdoorSelect);
          dialog.appendChild(floorWrap);
          dialog.appendChild(descriptionLabel);
          dialog.appendChild(descriptionInput);
          dialog.appendChild(actions);
          overlay.appendChild(dialog);
          document.body.appendChild(overlay);

          const closeDialog = (value) => {
            overlay.remove();
            markerDialogOpen = false;
            resolve(value);
          };

          cancelButton.addEventListener('click', () => closeDialog(null));
          saveButton.addEventListener('click', () => closeDialog({
            amenityType: amenityTypeSelect.value,
            indoorOutdoor: indoorOutdoorSelect.value,
            floor: indoorOutdoorSelect.value === 'indoor' ? floorInput.value.trim() : '',
            locationDescription: descriptionInput.value.trim()
          }));

          overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
              closeDialog(null);
            }
          });

          amenityTypeSelect.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              closeDialog({
                amenityType: amenityTypeSelect.value,
                indoorOutdoor: indoorOutdoorSelect.value,
                floor: indoorOutdoorSelect.value === 'indoor' ? floorInput.value.trim() : '',
                locationDescription: descriptionInput.value.trim()
              });
            } else if (event.key === 'Escape') {
              event.preventDefault();
              closeDialog(null);
            }
          });

          window.setTimeout(() => amenityTypeSelect.focus(), 0);
        });
      };

      const addMarkerAt = async (coordinates) => {
        const markerData = await openMarkerFormDialog();
        if (markerData === null) {
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
            title: markerData.amenityType || 'Untitled',
            amenityType: markerData.amenityType || 'Untitled',
            indoorOutdoor: markerData.indoorOutdoor || 'outdoor',
            floor: markerData.floor || '',
            locationDescription: markerData.locationDescription || '',
            id: Date.now() // Unique ID for the marker
          }

        });

        // Update the data source
        map.getSource('markers').setData(markers);
      };

      const pointHasMarker = (point) => {
        const features = map.queryRenderedFeatures(point, { layers: ['marker-circles'] });
        return features.length > 0;
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
        if (pointHasMarker(e.point)) {
          return;
        }

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
          if (pointHasMarker(e.point)) {
            return;
          }

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

      map.on('click', 'marker-circles', (e) => {
        const feature = e.features && e.features[0];
        if (!feature) {
          return;
        }

        const properties = feature.properties || {};
        const floorInfo = properties.indoorOutdoor === 'indoor'
          ? `<div><strong>Floor:</strong> ${escapeHtml(properties.floor || 'Not specified')}</div>`
          : '';
        const descriptionInfo = properties.locationDescription
          ? `<div><strong>Description:</strong> ${escapeHtml(properties.locationDescription)}</div>`
          : '<div><strong>Description:</strong> Not provided</div>';

        new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(
            `<div class="marker-info-popup">` +
            `<div><strong>Type:</strong> ${escapeHtml(properties.amenityType || 'Unknown')}</div>` +
            `<div><strong>Area:</strong> ${escapeHtml(properties.indoorOutdoor || 'Unknown')}</div>` +
            `${floorInfo}` +
            `${descriptionInfo}` +
            `</div>`
          )
          .addTo(map);
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
