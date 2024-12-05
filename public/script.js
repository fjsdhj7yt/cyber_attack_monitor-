document.addEventListener('DOMContentLoaded', () => {
    fetchRecentAttack();
    fetchAttackLogs();
});

async function fetchRecentAttack() {
    try {
        const response = await fetch('/api/recent-attack');
        const data = await response.json();
        displayRecentAttack(data);
    } catch (error) {
        console.error('Error fetching recent attack:', error);
    }
}

async function fetchAttackLogs() {
    try {
        const response = await fetch('/api/attack-logs');
        const data = await response.json();
        displayAttackLogs(data);
    } catch (error) {
        console.error('Error fetching attack logs:', error);
    }
}

function displayRecentAttack(attack) {
    const recentAttackDetails = document.getElementById('recent-attack-details');
    if (attack) {
        recentAttackDetails.innerHTML = `
            <div class="attack-card">
                <h3>${attack.predicted_attack || 'Unknown Attack'}</h3>
                <p>Timestamp: ${new Date(attack.timestamp).toLocaleString()}</p>
                <a href="/attack-details.html?id=${attack.id}" class="view-attack-btn">View Attack</a>
            </div>
        `;
    } else {
        recentAttackDetails.innerHTML = '<p>No recent attacks found.</p>';
    }
}

function displayAttackLogs(logs) {
    const attackLogsList = document.getElementById('attack-logs-list');
    attackLogsList.innerHTML = logs.map(log => `
        <div class="attack-card">
            <h3>${log.predicted_attack || 'Unknown Attack'}</h3>
            <p>Timestamp: ${new Date(log.timestamp).toLocaleString()}</p>
            <a href="/attack-details.html?id=${log.id}" class="view-attack-btn">View Attack</a>
        </div>
    `).join('');
}