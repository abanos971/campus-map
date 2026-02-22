// Define color mapping for amenity types
const AMENITY_COLORS = {
  'Gender-Inclusive Restroom': '#f57c00',
  'Compost Bin': '#1aa105',
  'Recycling Bin': '#0931e3',
  'Water Fountain': '#2ac6ff',
  'Handicapped Restroom': '#f57c00',
  'Elevator': '#ae00ff',
  'Ramp': '#f200ff',
  'Quiet Study': '#ff0000',
  'Group Study': '#a20000',
  'Prayer Room': '#ff00a6',
  'Lactation Room': '#ff007b',
  'Wellness Room': '#9dff00',
  'Other': '#666666'
};

// map.js safe "Logged in as" removal
const userInfoDiv = document.getElementById("userInfo");
const user = JSON.parse(localStorage.getItem("user"));

// If user is not logged in, redirect to login
if (!user) {
  window.location.href = "auth.html";
}

// Do NOT set any text for userInfoDiv
// userInfoDiv exists for JS stability, but stays hidden

// Fetch Mapbox token from server
async function initializeMap() {
  // === Show logged-in user info and enforce login ===
  const userInfoDiv = document.getElementById("userInfo");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    // User not logged in so redirect to login page
    window.location.href = "auth.html";
  } else {
    // User is logged in so show their username
    userInfoDiv.textContent = `Logged in as ${user.username}`;
  }
  try {
    const DEFAULT_CENTER = [-72.5314, 42.3866];
    const DEFAULT_ZOOM = 15;
    const RADIUS_MILES = 0.4;
    const METERS_PER_MILE = 1609.344;
    const RADIUS_METERS = RADIUS_MILES * METERS_PER_MILE;

    const getUserLocation = () => new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.longitude, position.coords.latitude]);
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });

    const getRadiusBounds = (centerLng, centerLat, radiusMeters) => {
      const latRadians = (centerLat * Math.PI) / 180;
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLng = 111320 * Math.cos(latRadians);
      const lngOffset = radiusMeters / metersPerDegreeLng;
      const latOffset = radiusMeters / metersPerDegreeLat;

      return [
        [centerLng - lngOffset, centerLat - latOffset],
        [centerLng + lngOffset, centerLat + latOffset]
      ];
    };

    const response = await fetch('/api/config');
    const config = await response.json();
    
    if (!config.mapboxToken) {
      alert('Mapbox token not found. Please check your .env file.');
      return;
    }

    mapboxgl.accessToken = config.mapboxToken;
    const userCenter = await getUserLocation();
    const initialCenter = userCenter || DEFAULT_CENTER;

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
      center: initialCenter, // User location when available, otherwise default center.
      zoom: DEFAULT_ZOOM,
      attributionControl: false // Hide attribution control
    });

    // GeoJSON feature collection to store markers
    const markers = {
      type: 'FeatureCollection',
      features: []
    };
    const currentUserId = user && user._id ? String(user._id) : null;

    // Wait for map to load before adding sources and layers
    map.on('load', async() => {
      const AMENITY_TYPES = [
        'Gender-Inclusive Restroom', 'Compost Bin', 'Recycling Bin', 'Water Fountain',
          'Handicapped Restroom', 'Elevator', 'Ramp',
          'Quiet Study', 'Group Study',
          'Prayer Room', 'Lactation Room', 'Wellness Room',
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

      const updateFeatureUpvotes = (markerId, nextUpvotes, upvotedByUserIds) => {
        const feature = markers.features.find((f) => f.properties && f.properties._id === markerId);
        if (!feature) {
          return;
        }

        feature.properties.upvotes = Number(nextUpvotes) || 0;
        if (Array.isArray(upvotedByUserIds)) {
          feature.properties.upvotedByUserIds = upvotedByUserIds;
        }
        map.getSource('markers').setData(markers);
      };

      const filterForm = document.getElementById('amenity-filter-form');

      const slugifyAmenity = (value) => (
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
      );

      const buildAmenityFilterControls = () => {
        if (!filterForm) {
          return;
        }

        filterForm.innerHTML = '';

        // Define amenity groupings
        const amenityGroups = {
          'Facilities': ['Gender-Inclusive Restroom', 'Compost Bin', 'Recycling Bin', 'Water Fountain'],
          'Accessibility': ['Handicapped Restroom', 'Elevator', 'Ramp'],
          'Study Space': ['Quiet Study', 'Group Study'],
          'Rooms': ['Prayer Room', 'Lactation Room', 'Wellness Room'],
          'Other': ['Other']
        };

        // Count amenities by type
        const amenityTypeCounts = {};
        AMENITY_TYPES.forEach((type) => {
          amenityTypeCounts[type] = 0;
        });
        
        markers.features.forEach((feature) => {
          if (feature.properties && feature.properties.amenityType) {
            const type = feature.properties.amenityType;
            if (amenityTypeCounts.hasOwnProperty(type)) {
              amenityTypeCounts[type]++;
            }
          }
        });

        // Add "Select All" checkbox
        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'select-all-label';
        selectAllLabel.style.marginBottom = '12px';
        selectAllLabel.style.paddingBottom = '12px';
        selectAllLabel.style.borderBottom = '1px solid #ddd';
        selectAllLabel.style.fontWeight = 'bold';

        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'select-all-amenities';
        selectAllCheckbox.name = 'select-all';
        selectAllCheckbox.checked = true;

        selectAllLabel.appendChild(selectAllCheckbox);
        selectAllLabel.append(' Select All');
        filterForm.appendChild(selectAllLabel);

        // Add grouped amenities
        Object.entries(amenityGroups).forEach(([groupName, amenities], index) => {
          // Add group header
          const groupHeader = document.createElement('div');
          groupHeader.style.marginTop = '16px';
          groupHeader.style.marginBottom = '8px';
          groupHeader.style.fontWeight = '600';
          groupHeader.style.fontSize = '14px';
          groupHeader.style.color = '#333';
          groupHeader.textContent = groupName;
          filterForm.appendChild(groupHeader);

          // Add amenities in this group
          amenities.forEach((amenityType) => {
            const label = document.createElement('label');
            label.setAttribute('data-amenity', slugifyAmenity(amenityType));
            label.style.marginLeft = '12px'; // Indent subcategories

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'amenity-filter';
            checkbox.value = amenityType;
            checkbox.checked = true;

            // Set checkbox color based on amenity type
            const color = AMENITY_COLORS[amenityType] || '#666666';
            checkbox.style.accentColor = color;

            label.appendChild(checkbox);
            
            // Add amenity type with count
            const count = amenityTypeCounts[amenityType] || 0;
            label.append(` ${amenityType} (${count})`);
            
            // Style label text with amenity color
            label.style.color = color;
            filterForm.appendChild(label);
          });

          // Add separator line between groups (except after the last group)
          if (index < Object.keys(amenityGroups).length - 1) {
            const separator = document.createElement('div');
            separator.style.borderBottom = '1px solid #ddd';
            separator.style.marginTop = '12px';
            separator.style.marginBottom = '0px';
            filterForm.appendChild(separator);
          }
        });

        // Handle select all checkbox
        selectAllCheckbox.addEventListener('change', (event) => {
          const isChecked = event.target.checked;
          filterForm.querySelectorAll('input[name="amenity-filter"]').forEach((checkbox) => {
            checkbox.checked = isChecked;
          });
          applyAmenityFilter();
        });
      };

      const getSelectedAmenityTypes = () => {
        if (!filterForm) {
          return AMENITY_TYPES;
        }

        return Array.from(
          filterForm.querySelectorAll('input[name="amenity-filter"]:checked')
        ).map((checkbox) => checkbox.value);
      };

      const applyAmenityFilter = () => {
        const selected = getSelectedAmenityTypes();
        const filterExpression = selected.length > 0
          ? ['in', ['get', 'amenityType'], ['literal', selected]]
          : ['==', ['get', 'amenityType'], '__none__'];

        map.setFilter('marker-circles', filterExpression);
        map.setFilter('marker-text', filterExpression);

        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('select-all-amenities');
        if (selectAllCheckbox) {
          const totalAmenities = filterForm.querySelectorAll('input[name="amenity-filter"]').length;
          selectAllCheckbox.checked = selected.length === totalAmenities;
        }
      };

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
            { value: 'Indoor', text: 'Indoor' },
            { value: 'Outdoor', text: 'Outdoor' }
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
            floorWrap.style.display = indoorOutdoorSelect.value === 'Indoor' ? 'block' : 'none';
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
            floor: indoorOutdoorSelect.value === 'Indoor' ? floorInput.value.trim() : '',
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
                floor: indoorOutdoorSelect.value === 'Indoor' ? floorInput.value.trim() : '',
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
        if (!markerData) return;

        const payload = {
          ...markerData,
          lng: coordinates.lng,
          lat: coordinates.lat
        };

        try {
          const res = await fetch('/markers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const savedMarker = await res.json(); // POST returns {_id: "...", ...}

          // Add marker to frontend map using correct _id
          markers.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
            properties: {
              title: savedMarker.amenityType || 'Untitled',
              amenityType: savedMarker.amenityType || 'Untitled',
              indoorOutdoor: savedMarker.indoorOutdoor || 'outdoor',
              floor: savedMarker.floor || '',
              locationDescription: savedMarker.locationDescription || '',
              upvotes: Number(savedMarker.upvotes) || 0,
              upvotedByUserIds: Array.isArray(savedMarker.upvotedByUserIds) ? savedMarker.upvotedByUserIds : [],
              _id: savedMarker._id // 🔑 Must match Mongo _id
            }
          });

          // Update the Mapbox source
          map.getSource('markers').setData(markers);

          // Update filter controls
          buildAmenityFilterControls();
          applyAmenityFilter();

        } catch (err) {
          console.error('Failed to save marker:', err);
        }
      };

      const addCurrentLocationButton = document.getElementById('add-current-location-btn');
      if (addCurrentLocationButton) {
        addCurrentLocationButton.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const currentLocation = await getUserLocation();
          if (currentLocation) {
            map.flyTo({
              center: currentLocation,
              zoom: Math.max(map.getZoom(), 16),
              duration: 600
            });

            await addMarkerAt({
              lng: currentLocation[0],
              lat: currentLocation[1]
            });
            return; 
          }

          const center = map.getCenter();
          await addMarkerAt({
            lng: center.lng,
            lat: center.lat
          });
        });
      }

      const pointHasMarker = (point) => {
        const features = map.queryRenderedFeatures(point, { layers: ['marker-circles'] });
        return features.length > 0;
      };
      

      // Add a source for the markers
      map.addSource('markers', {
        type: 'geojson',
        data: markers
      });

      if (userCenter) {
        map.addSource('user-location', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: userCenter
            },
            properties: {}
          }
        });

        map.addLayer({
          id: 'user-location-dot',
          type: 'circle',
          source: 'user-location',
          paint: {
            'circle-radius': 6,
            'circle-color': '#1d4ed8',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        });

        map.fitBounds(getRadiusBounds(userCenter[0], userCenter[1], RADIUS_METERS), {
          padding: 32,
          maxZoom: 16,
          duration: 0
        });
      }

      // Add a circle layer for the markers
      map.addLayer({
        id: 'marker-circles',
        type: 'circle',
        source: 'markers',
        paint: {
          'circle-radius': 12,
          'circle-color': [
            'case',
            ['has', ['get', 'amenityType'], ['literal', AMENITY_COLORS]],
            ['get', ['get', 'amenityType'], ['literal', AMENITY_COLORS]],
            '#666666'
          ],
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

      // Load saved markers from DB on map init
      try {
        const res = await fetch('/markers');
        const savedMarkers = await res.json();
        savedMarkers.forEach(marker => {
          markers.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [marker.lng, marker.lat] },
            properties: {
              title: marker.amenityType,
              amenityType: marker.amenityType,
              indoorOutdoor: marker.indoorOutdoor,
              floor: marker.floor,
              locationDescription: marker.locationDescription,
              upvotes: Number(marker.upvotes) || 0,
              upvotedByUserIds: Array.isArray(marker.upvotedByUserIds) ? marker.upvotedByUserIds : [],
              _id: marker._id
            }
          });
        });
        map.getSource('markers').setData(markers);
      } catch (err) {
        console.error('Failed to load markers from DB:', err);
      }

      buildAmenityFilterControls();
      applyAmenityFilter();

      if (filterForm) {
        filterForm.addEventListener('change', (event) => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) {
            return;
          }

          if (target.name === 'amenity-filter') {
            applyAmenityFilter();
          }
        });
      }

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
        const feature = e.features[0];
        if (!feature) return;

        // Create the popup
        const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(`
      <div class="marker-info-popup">
        <div><strong>Type:</strong> ${escapeHtml(feature.properties.amenityType)}</div>
        <div><strong>Area:</strong> ${escapeHtml(feature.properties.indoorOutdoor)}</div>
        <div><strong>Floor:</strong> ${escapeHtml(feature.properties.floor || 'Not specified')}</div>
        <div><strong>Description:</strong> ${escapeHtml(feature.properties.locationDescription || 'Not provided')}</div>
        <div class="marker-vote-row">
          <button class="upvote-btn" aria-label="Upvote marker">👍 <span class="upvote-count">${Number(feature.properties.upvotes) || 0}</span></button>
        </div>
        <div class="marker-popup-actions">
          <button class="delete-btn">Delete</button>
        </div>
      </div>
    `)
          .addTo(map);

        // Attach popup button listeners
        setTimeout(() => {
          const markerId = feature.properties._id;
          const upvotedByUserIds = Array.isArray(feature.properties.upvotedByUserIds)
            ? feature.properties.upvotedByUserIds
            : [];
          const upvoteBtn = popup.getElement().querySelector('.upvote-btn');
          const upvoteCountEl = popup.getElement().querySelector('.upvote-count');
          const deleteBtn = popup.getElement().querySelector('.delete-btn');
          const hasVoted = markerId && currentUserId && upvotedByUserIds.includes(currentUserId);

          if (upvoteBtn) {
            if (hasVoted) {
              upvoteBtn.disabled = true;
              upvoteBtn.classList.add('is-confirmed');
            }

            upvoteBtn.addEventListener('click', async (evt) => {
              evt.stopPropagation();

              if (!markerId || upvoteBtn.disabled) {
                return;
              }
              if (!currentUserId) {
                alert('Please sign in to upvote markers.');
                return;
              }

              try {
                upvoteBtn.disabled = true;

                const res = await fetch(`/markers/${markerId}/upvote`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: currentUserId })
                });
                const data = await res.json();

                if (!res.ok) {
                  if (res.status === 409) {
                    if (upvoteCountEl) {
                      upvoteCountEl.textContent = String(Number(data.upvotes) || 0);
                    }
                    updateFeatureUpvotes(markerId, data.upvotes, data.upvotedByUserIds);
                    upvoteBtn.classList.add('is-confirmed');
                  } else {
                    upvoteBtn.disabled = false;
                    alert(data.error || 'Upvote failed');
                  }
                  return;
                }

                const nextUpvotes = Number(data.upvotes) || 0;
                if (upvoteCountEl) {
                  upvoteCountEl.textContent = String(nextUpvotes);
                }

                updateFeatureUpvotes(markerId, nextUpvotes, data.upvotedByUserIds);
                upvoteBtn.classList.add('is-confirmed');
              } catch (err) {
                console.error('Upvote failed:', err);
                upvoteBtn.disabled = false;
              }
            });
          }

          if (!deleteBtn) return;

          deleteBtn.addEventListener('click', async (evt) => {
            evt.stopPropagation();
            if (!markerId) return;

            try {
              const res = await fetch(`/markers/${markerId}`, { method: 'DELETE' });
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Delete failed');
                return;
              }

              // Remove marker from frontend GeoJSON
              markers.features = markers.features.filter(f => f.properties._id !== markerId);
              map.getSource('markers').setData(markers);

              // Remove the popup immediately after successful delete
              popup.remove();

              // Update the filter UI
              buildAmenityFilterControls();
              applyAmenityFilter();

            } catch (err) {
              console.error('Delete failed:', err);
            }
          });
        }, 0);
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

// Open sidebar when hamburger menu is clicked
document.getElementById('menuBtn').addEventListener('click', function() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
});

// Close sidebar when close button is clicked
document.getElementById('closeSidebar').addEventListener('click', function() {
  document.getElementById('sidebar').classList.remove('open');
});

// Close sidebar when clicking on the map area
document.getElementById('map').addEventListener('click', function() {
  document.getElementById('sidebar').classList.remove('open');
});

// Login / Logout button behavior (use user object primarily, token as fallback)
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token"); // fallback if needed

  if (user || token) {
    // Prefer showing username if available
    loginBtn.textContent = user?.username ? `Logout (${user.username})` : "Logout";
    loginBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      location.reload();
    });
  } else {
    loginBtn.textContent = "Sign In";
    loginBtn.addEventListener("click", () => {
      window.location.href = "/auth.html";
    });
  }
}
