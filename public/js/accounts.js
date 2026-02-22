// // Redirect if not logged in
// const token = localStorage.getItem("token");

// if (!token) {
//   window.location.href = "/auth.html";
// }

// Back button
document.getElementById("backBtn").onclick = () => {
  window.location.href = "/";
};

// Logout button
document.getElementById("logoutBtn").onclick = () => {
  localStorage.removeItem("token");
  window.location.href = "/";
};

// Load user's amenities
async function loadAmenities() {
  try {
    const res = await fetch("/api/my-amenities", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const amenities = await res.json();

    const list = document.getElementById("amenitiesList");

    if (amenities.length === 0) {
      list.innerHTML = "<p>You haven't added any amenities yet.</p>";
      return;
    }

    list.innerHTML = amenities.map(a => `
      <div class="amenity-card">
        <h3>${a.amenityType}</h3>
        <p>${a.locationDescription || "No description"}</p>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);
  }
}

loadAmenities();