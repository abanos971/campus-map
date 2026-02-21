// Initialize Mapbox
// Get token from .env file
mapboxgl.accessToken = process.env.MAPBOX_TOKEN || '';

if (!mapboxgl.accessToken) {
    console.error('Mapbox token not found. Please set MAPBOX_TOKEN in your .env file');
}

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-74.5, 40],
    zoom: 9
});

map.on('load', () => {
    console.log('Map loaded successfully!');
    // Add any map initialization code here
});
