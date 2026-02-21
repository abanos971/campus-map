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
