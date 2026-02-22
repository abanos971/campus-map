const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const message = document.getElementById("message");

// Switch tabs
loginTab.onclick = () => {
  loginForm.classList.add("active");
  signupForm.classList.remove("active");
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
};

signupTab.onclick = () => {
  signupForm.classList.add("active");
  loginForm.classList.remove("active");
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
};

// LOGIN
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = loginEmail.value;
  const password = loginPassword.value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    localStorage.setItem("token", data.token);
    window.location.href = "map.html";

  } catch (err) {
    message.textContent = err.message;
  }
});

// SIGNUP
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = signupUsername.value;
  const email = signupEmail.value;
  const password = signupPassword.value;

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    message.style.color = "green";
    message.textContent = "Account created! You can log in now.";

    loginTab.click();

  } catch (err) {
    message.textContent = err.message;
  }
});