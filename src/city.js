// The city across the sea (filled in next).
const city = { active: false };
function cityActive() { return city.active; }
function cityKey() { return false; }
function cityClick() { return false; }
function cityClamp() {}
function updateCity() {}
function resetCity() { city.active = false; }
function saveCity() { return { active: false }; }
function loadCity() {}
