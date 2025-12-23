// Constants
const APIKEY = '67a9a09c020c068f77e6537d';
const FEEDBACK_API = 'https://fedpart2-130c.restdb.io/rest/feedback';
const STAFF_API = 'https://fedpart2-130c.restdb.io/rest/supportstaff';

// DOM Elements
const feedbackForm = document.getElementById('feedback-form');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const feedbackList = document.querySelector('.feedback-list');
const ratingModal = document.getElementById('rating-modal');
const stars = document.querySelectorAll('.star');
const submitRatingBtn = document.getElementById('submit-rating');
const closeModalBtn = document.getElementById('close-modal');

// State
let currentFeedbackId = null;
let currentRating = 0;
let supportStaff = [];

// Load Support Staff
async function loadSupportStaff() {
    try {
        const response = await fetch(`${STAFF_API}?q={"active":true}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load support staff');
        }

        supportStaff = await response.json();
        console.log('Support staff loaded:', supportStaff);
    } catch (error) {
        console.error('Error loading support staff:', error);
        alert('Failed to load support staff. Using fallback assignment.');
        // Fallback support staff in case of API failure
        supportStaff = [
            { id: 'staff1', name: 'Support Team', specialization: 'technical' }
        ];
    }
}

// Initialize by loading support staff
loadSupportStaff();

// Submit Feedback
feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const category = document.getElementById('category').value;
    
    // Find available support staff for the category
    const availableStaff = supportStaff.filter(staff => 
        staff.specialization === category && 
        staff.status === 'available'
    );
    
    // Select staff member with least cases or any available staff
    const assignedStaff = availableStaff.length > 0
        ? availableStaff.reduce((prev, curr) => 
            (prev.cases_handled || 0) <= (curr.cases_handled || 0) ? prev : curr
        )
        : supportStaff[0];
    
    const feedback = {
        user_id: 'anonymous',
        user_email: emailInput.value,
        category: category,
        priority: document.getElementById('priority').value,
        subject: document.getElementById('subject').value,
        description: document.getElementById('description').value,
        status: 'assigned',
        created_at: new Date().toISOString(),
        support_staff_id: assignedStaff._id || assignedStaff.id,
        support_staff_name: assignedStaff.name,
        rating: 0,
        rating_comment: ''
    };

    try {
        // Submit feedback
        const response = await fetch(FEEDBACK_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(feedback)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error('Failed to submit feedback');
        }

        // Update staff member's status to busy
        const staffUpdateResponse = await fetch(`${STAFF_API}/${assignedStaff._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                status: 'busy',
                cases_handled: (assignedStaff.cases_handled || 0) + 1
            })
        });

        if (!staffUpdateResponse.ok) {
            console.error('Failed to update staff status');
        }

        const result = await response.json();
        console.log('Success:', result);
        alert('Feedback submitted successfully and assigned to support staff!');
        feedbackForm.reset();
        
        // Reload support staff data
        loadSupportStaff();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to submit feedback. Please try again.');
    }
});

// Load Feedback History
async function loadFeedbackHistory() {
    try {
        const response = await fetch(FEEDBACK_API, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load feedback history');
        }

        const feedbacks = await response.json();
        displayFeedbackHistory(feedbacks);
    } catch (error) {
        console.error('Error:', error);
        feedbackList.innerHTML = '<p>Failed to load feedback history. Please try again.</p>';
    }
}

// Display Feedback History
function displayFeedbackHistory(feedbacks) {
    if (feedbacks.length === 0) {
        feedbackList.innerHTML = '<p>No feedback history found</p>';
        return;
    }

    feedbackList.innerHTML = feedbacks.map(feedback => `
        <div class="feedback-card">
            <div class="feedback-header">
                <h3>${feedback.subject}</h3>
                <span class="feedback-status status-${feedback.status}">${feedback.status}</span>
            </div>
            <p><strong>Category:</strong> ${feedback.category}</p>
            <p><strong>Priority:</strong> ${feedback.priority}</p>
            <p><strong>Description:</strong> ${feedback.description}</p>
            <p><strong>Submitted:</strong> ${new Date(feedback.created_at).toLocaleDateString()}</p>
            ${feedback.support_staff_name ? `
                <p><strong>Assigned to:</strong> ${feedback.support_staff_name}</p>
            ` : ''}
            ${feedback.status !== 'resolved' ? `
                <button onclick="resolveTestFeedback('${feedback._id}')" class="submit-btn" style="background-color: #10b981;">
                    Mark as Resolved
                </button>
            ` : ''}
            ${feedback.status === 'resolved' && !feedback.rating ? `
                <button onclick="openRatingModal('${feedback._id}')" class="submit-btn">Rate Support</button>
            ` : ''}
            ${feedback.rating ? `
                <div class="rating-display">
                    <p><strong>Your Rating:</strong> ${'★'.repeat(feedback.rating)}${'☆'.repeat(5-feedback.rating)}</p>
                    ${feedback.rating_comment ? `<p><strong>Comment:</strong> ${feedback.rating_comment}</p>` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Tab Functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        if (tab === 'history') {
            loadFeedbackHistory();
        }
    });
});

// Rating Modal Functionality
function openRatingModal(feedbackId) {
    currentFeedbackId = feedbackId;
    currentRating = 0;
    ratingModal.style.display = 'block';
    updateStars(0);
    document.getElementById('rating-comment').value = '';
}

stars.forEach(star => {
    star.addEventListener('mouseover', () => {
        updateStars(star.dataset.rating);
    });

    star.addEventListener('mouseout', () => {
        updateStars(currentRating);
    });

    star.addEventListener('click', () => {
        currentRating = parseInt(star.dataset.rating);
        updateStars(currentRating);
    });
});

function updateStars(rating) {
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        star.classList.toggle('active', starRating <= rating);
    });
}

submitRatingBtn.addEventListener('click', async () => {
    if (!currentRating) {
        alert('Please select a rating');
        return;
    }

    try {
        // Get the feedback to update the staff's average rating
        const feedbackResponse = await fetch(`${FEEDBACK_API}/${currentFeedbackId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            }
        });

        if (!feedbackResponse.ok) {
            throw new Error('Failed to get feedback details');
        }

        const feedback = await feedbackResponse.json();
        
        // Update feedback with rating
        const response = await fetch(`${FEEDBACK_API}/${currentFeedbackId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                rating: currentRating,
                rating_comment: document.getElementById('rating-comment').value
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit rating');
        }

        // Update staff member's status and rating
        const staffMember = supportStaff.find(staff => staff._id === feedback.support_staff_id);
        if (staffMember) {
            const newAvgRating = (
                (staffMember.average_rating * staffMember.cases_handled + currentRating) / 
                (staffMember.cases_handled + 1)
            ).toFixed(2);

            const staffUpdateResponse = await fetch(`${STAFF_API}/${feedback.support_staff_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-apikey': APIKEY,
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    status: 'available',
                    average_rating: parseFloat(newAvgRating)
                })
            });

            if (!staffUpdateResponse.ok) {
                console.error('Failed to update staff rating');
            }
        }

        alert('Rating submitted successfully!');
        ratingModal.style.display = 'none';
        loadFeedbackHistory();
        loadSupportStaff(); // Reload staff data
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to submit rating. Please try again.');
    }
});

closeModalBtn.addEventListener('click', () => {
    ratingModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === ratingModal) {
        ratingModal.style.display = 'none';
    }
});

// Test function to simulate resolving a feedback
async function resolveTestFeedback(feedbackId) {
    try {
        const response = await fetch(`${FEEDBACK_API}/${feedbackId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-apikey': APIKEY,
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                status: 'resolved'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to resolve feedback');
        }

        alert('Feedback marked as resolved. Please rate the support staff.');
        loadFeedbackHistory();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to resolve feedback. Please try again.');
    }
}