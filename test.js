const apiBase = "local"; // Change to your PHP file's location

// Fetch and display players
async function fetchPlayers() {
    try {
        const response = await fetch(`${apiBase}?action=read`);
        const players = await response.json();

        const playerList = document.getElementById("player-list");
        playerList.innerHTML = ""; // Clear list
        players.forEach(player => {
            const li = document.createElement("li");
            li.textContent = `${player.name}: ${player.score}`;
            playerList.appendChild(li);
        });
    } catch (error) {
        console.error("Error fetching players:", error);
    }
}

// Add a new player
document.getElementById("write-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const score = parseInt(document.getElementById("score").value, 10);

    try {
        const response = await fetch(`${apiBase}?action=write`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, score }),
        });

        const result = await response.json();
        if (result.success) {
            alert("Player added!");
            fetchPlayers(); // Refresh the list
        } else {
            alert("Error adding player: " + result.error);
        }
    } catch (error) {
        console.error("Error adding player:", error);
    }
});

// Initial load
fetchPlayers();
