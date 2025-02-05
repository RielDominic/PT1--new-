let progressTimeout;
let storyQueue = []; // Your story queue array, should be filled with story objects
let cropper; // Global variable to store the cropper instance
let rotationAngle = 0; // Track the rotation angle

// Previous and Next Story Scroll
document.getElementById('prevStory').addEventListener('click', () => {
    document.getElementById('storiesContainer').scrollBy({ left: -100, behavior: 'smooth' });
});

document.getElementById('nextStory').addEventListener('click', () => {
    document.getElementById('storiesContainer').scrollBy({ left: 100, behavior: 'smooth' });
});

// Open Story Viewer (Display Media)
function openStoryViewer(storyURL, fileType) {
    const viewer = document.getElementById('storyViewer');
    const viewerImage = document.getElementById('viewerImage');
    const viewerVideo = document.getElementById('viewerVideo');

    if (fileType.startsWith('image')) {
        viewerImage.src = storyURL;
        viewerImage.style.display = 'block';
        viewerVideo.style.display = 'none';
    } else if (fileType.startsWith('video')) {
        viewerVideo.src = storyURL;
        viewerVideo.style.display = 'block';
        viewerImage.style.display = 'none';
    }

    viewer.style.display = 'flex'; // Show viewer
}

// Close Story Viewer
document.getElementById('closeViewer').addEventListener('click', () => {
    document.getElementById('storyViewer').style.display = 'none';
});

// Add Post Function
function addPost() {
    const text = document.getElementById('postText').value;
    const file = document.getElementById('postImage').files[0];

    if (!text && !file) {
        alert('Write something or add a media file.');
        return;
    }

    const postContainer = document.getElementById('postsContainer');
    const post = document.createElement('div');
    post.classList.add('post');
    post.innerHTML = `<p>${text}</p>`;

    if (file) {
        if (file.type.startsWith('image')) {
            post.innerHTML += `<img src="${URL.createObjectURL(file)}">`;
        } else {
            post.innerHTML += `<video src="${URL.createObjectURL(file)}" controls></video>`;
        }
    }

    postContainer.prepend(post);
}

// Open Story Upload Modal
function openStoryUpload() {
    document.getElementById('storyUploadModal').style.display = 'flex';
}

// Close Story Upload Modal
function closeStoryUpload() {
    document.getElementById('storyUploadModal').style.display = 'none';
    document.getElementById('storyPreview').innerHTML = '';
    cropper = null;
    videoElement = null;
    trimmedBlob = null;
}

// Upload Story
function uploadStory() {
    const fileInput = document.getElementById('storyFileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file.");
        return;
    }

    const storyContainer = document.getElementById('storiesContainer');
    const story = document.createElement('div');
    story.classList.add('story');

    let finalMedia;

    if (file.type.startsWith('image') && cropper) {
        const canvas = cropper.getCroppedCanvas();
        finalMedia = canvas.toDataURL();
    } else if (file.type.startsWith('video')) {
        finalMedia = URL.createObjectURL(trimmedBlob || file);
    } else {
        finalMedia = URL.createObjectURL(file);
    }

    // Create story thumbnail
    const mediaElement = document.createElement(file.type.startsWith('image') ? 'img' : 'video');
    mediaElement.src = finalMedia;
    mediaElement.alt = 'Story Media';
    mediaElement.classList.add('story-media');
    mediaElement.onclick = () => openStoryViewer(finalMedia, file.type);

    story.appendChild(mediaElement);
    storyContainer.appendChild(story);

    closeStoryUpload();
}


// Dark Mode Toggle
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

darkModeToggle.addEventListener('click', function() {
    body.classList.toggle('dark-mode');
    const icon = darkModeToggle.querySelector('.material-symbols-outlined');

    // Add animation class
    icon.classList.add('icon-animation');

    // Change the icon text content based on dark mode status
    if (body.classList.contains('dark-mode')) {
        icon.textContent = 'light_mode';  // Change icon to 'light_mode'
    } else {
        icon.textContent = 'dark_mode';   // Change icon back to 'dark_mode'
    }

    // Remove the animation class after animation duration to reset
    setTimeout(() => {
        icon.classList.remove('icon-animation');
    }, 300); // 300ms should match the duration of your animation
});

// Handle File Preview
function previewStory() {
    const fileInput = document.getElementById('storyFileInput');
    const file = fileInput.files[0];
    const previewContainer = document.getElementById('storyPreview');
    
    previewContainer.innerHTML = ''; // Clear previous preview

    if (!file) return;

    const url = URL.createObjectURL(file);
    
    if (file.type.startsWith('image')) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        previewContainer.appendChild(img);

        // Initialize Cropper.js for image editing
        cropper = new Cropper(img, {
            aspectRatio: NaN, // Freeform cropping
            viewMode: 1
        });

    } else if (file.type.startsWith('video')) {
        videoElement = document.createElement('video');
        videoElement.src = url;
        videoElement.controls = true;
        videoElement.style.maxWidth = '100%';
        videoElement.style.maxHeight = '300px';
        previewContainer.appendChild(videoElement);
    }
}


function showStory(index) {
    if (index < 0 || index >= storyQueue.length) {
        // Hide story viewer and clear the timeout
        document.getElementById('storyViewer').classList.remove('active');
        clearTimeout(progressTimeout);
        return;
    }

    const story = storyQueue[index];
    const storyViewerContent = document.getElementById('storyViewer').querySelector('.story-viewer-content');
    storyViewerContent.innerHTML = ''; // Clear existing content

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.classList.add('close-button');
    closeButton.addEventListener('click', () => {
        const video = storyViewerContent.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        document.getElementById('storyViewer').classList.remove('active');
        clearTimeout(progressTimeout); // Clear timeout on close
    });
    storyViewerContent.appendChild(closeButton);

    // Set content based on story type
    if (story.type === 'image') {
        const img = document.createElement('img');
        img.src = story.src;
        storyViewerContent.appendChild(img);
        updateProgressBar(5000, () => showStory(index + 1)); // Image duration (5 seconds)
    } else if (story.type === 'video') {
        const video = document.createElement('video');
        video.src = story.src;
        video.autoplay = true;
        storyViewerContent.appendChild(video);

        // Handle video playback and progress
        video.onloadedmetadata = () => {
            updateProgressBar(15000, () => { // Video duration (15 seconds)
                video.pause();
                video.currentTime = 0;
                showStory(index + 1); // Move to the next story
            });
        };

        video.onended = () => {
            clearTimeout(progressTimeout);
            showStory(index + 1); // Skip to the next story when video ends
        };
    }

    document.getElementById('storyViewer').classList.add('active');
}

function updateProgressBar(duration, callback) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';

    requestAnimationFrame(() => {
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '100%';

        // Trigger the callback after the animation duration
        setTimeout(() => {
            if (typeof callback === 'function') {
                callback();
            }
        }, duration);
    });
}

// Rotate Image
function rotateImage() {
    if (cropper) {
        rotationAngle += 90; // Rotate by 90 degrees
        cropper.rotate(90);  // Apply rotation
    }
}

// Get the cropped image and process it (optional)
function getCroppedImage() {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas();
        const croppedImageURL = canvas.toDataURL();
        console.log(croppedImageURL); // Optionally, you can upload the cropped image
    }
}

// Trim Video (Simple Example)
function trimVideo() {
    if (!videoElement) {
        alert("Please select a video first.");
        return;
    }

    const startTime = prompt("Enter start time in seconds:");
    const endTime = prompt("Enter end time in seconds:");

    if (!startTime || !endTime || startTime >= endTime) {
        alert("Invalid trim times.");
        return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    videoElement.currentTime = startTime;

    videoElement.addEventListener('timeupdate', function captureFrame() {
        if (videoElement.currentTime >= endTime) {
            videoElement.pause();
            videoElement.removeEventListener('timeupdate', captureFrame);

            // Convert the trimmed video to Blob (Placeholder approach)
            videoElement.src = URL.createObjectURL(trimmedBlob);
            alert("Trimming complete. Click upload to save.");
        }
    });

    videoElement.play();
}
