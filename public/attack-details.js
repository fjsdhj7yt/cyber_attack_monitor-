document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const attackId = urlParams.get('id');
    if (attackId) {
        fetchAttackDetails(attackId);
        fetchSrcIpInfo(attackId); // Fetch source IP information
    }

    document.getElementById('submit-feedback').addEventListener('click', submitFeedback);
    document.getElementById('feedback-select').addEventListener('change', handleFeedbackSelect);
});

// Function to handle the display of the custom attack input
function handleFeedbackSelect() {
    const feedbackSelect = document.getElementById('feedback-select');
    const otherAttackInput = document.getElementById('other-attack-input');

    // Show custom attack input only if 'Other' is selected
    if (feedbackSelect.value === 'Other') {
        otherAttackInput.style.display = 'block';
    } else {
        otherAttackInput.style.display = 'none';
        document.getElementById('custom-attack-name').value = ''; // Clear custom name field
    }
}

// Function to fetch attack details from the server
async function fetchAttackDetails(attackId) {
    try {
        const response = await fetch(`/api/attack-details/${attackId}`);
        const data = await response.json();

        // Log the response to verify the base64 image data
        console.log('Attack Details:', data);

        displayAttackDetails(data);
    } catch (error) {
        console.error('Error fetching attack details:', error);
    }
}

// Function to display attack details on the page
function displayAttackDetails(attack) {
    const attackInfo = document.getElementById('attack-info');

    // Display the attack information
    attackInfo.innerHTML = `
        <h2>${attack.predicted_attack || 'Unknown Attack'}</h2>
        <p>Timestamp: ${new Date(attack.timestamp).toLocaleString()}</p>
        <p>Explanation: ${attack.explanation || 'No explanation available.'}</p>
    `;

    // Handle the visualization image if available
    const visualizationImage = document.getElementById('visualization-image');
    if (attack.visualization) {
        visualizationImage.innerHTML = `
            <h3>Visualization</h3>
            <img src="${attack.visualization}" alt="Visualization Image" style="max-width: 100%; height: auto;">
        `;
    } else {
        visualizationImage.innerHTML = '<p>No visualization image available.</p>';
    }
}

// Function to fetch source IP information from the server
async function fetchSrcIpInfo(attackId) {
    try {
        const response = await fetch(`/api/src-ip-info/${attackId}`);
        const data = await response.json();

        // Log the source IP info and VirusTotal data to verify
        console.log('Source IP and VirusTotal Info:', data);

        displaySrcIpInfo(data);
    } catch (error) {
        console.error('Error fetching source IP info:', error);
    }
}

// Display the source IP info and VirusTotal details on the page
function displaySrcIpInfo(info) {
    const srcIpInfoDiv = document.getElementById('src-ip-info');

    if (info.virus_total_info) {
        srcIpInfoDiv.innerHTML = `
            <h3>Source IP Information VirusTotal</h3>
            <p>Source IP: ${info.src_ip}</p>
            <p>Country: ${info.virus_total_info.country}</p>
            <p>Network/ASN: ${info.virus_total_info.network}</p>
            <p>Malicious: ${info.virus_total_info.malicious}</p>
        `;
    } else {
        srcIpInfoDiv.innerHTML = `
            <h3>Source IP Information</h3>
            <p>Source IP: ${info.src_ip}</p>
            <p>${info.message}</p>
        `;
    }
}

// Function to handle feedback submission
async function submitFeedback() {
    const feedbackSelect = document.getElementById('feedback-select');
    let feedbackType = feedbackSelect.value;
    const feedbackExplanation = document.getElementById('feedback-explanation').value;
    const customAttackName = document.getElementById('custom-attack-name').value; // Custom attack name for 'Other' option
    const urlParams = new URLSearchParams(window.location.search);
    const attackId = urlParams.get('id');

    if (!feedbackType || !feedbackExplanation) {
        alert('Please select an attack type and provide an explanation before submitting feedback.');
        return;
    }

    // Use custom attack name if 'Other' is selected
    if (feedbackType === 'Other') {
        if (!customAttackName) {
            alert('Please enter a custom attack name.');
            return;
        }
        feedbackType = customAttackName; // Set custom name as feedbackType
    }

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ attackId, feedbackType, feedbackExplanation })
        });

        const data = await response.json();

        if (data.success) {
            alert('Feedback submitted successfully. Thank you!');
            feedbackSelect.value = '';
            document.getElementById('feedback-explanation').value = '';
            document.getElementById('custom-attack-name').value = ''; // Clear custom attack field
            handleFeedbackSelect(); // Reset the feedback form display
        } else {
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback. Please try again.');
    }
}
