// Open sidebar when hamburger menu is clicked
document.getElementById('menuBtn').addEventListener('click', function() {
  document.getElementById('sidebar').classList.add('open');
});

// Close sidebar when close button is clicked
document.getElementById('closeSidebar').addEventListener('click', function() {
  document.getElementById('sidebar').classList.remove('open');
});

// Close sidebar when clicking on the map area
document.getElementById('map').addEventListener('click', function() {
  document.getElementById('sidebar').classList.remove('open');
});

// Optional: Handle category changes
document.querySelectorAll('.sidebar-content input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    const category = this.value;
    const isChecked = this.checked;
    console.log(`Category: ${category}, Checked: ${isChecked}`);
    // You can add logic here to filter the map based on selected categories
  });
});