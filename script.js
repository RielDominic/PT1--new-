let progressTimeout;
let storyQueue = []; // Your story queue array, should be filled with story objects
let cropper; // Global variable to store the cropper instance
let rotationAngle = 0; // Track the rotation angle
let currentStoryIndex = 0;
let stories = [];
let trimmedBlob = null;
let trimmedStartTime = 0;
let trimmedEndTime = 0;
let videoTimeout; // Declare a global variable to handle timeout for switching stories
let currentVideoTime = 0; // Track the current time of the video to maintain continuity
let isVideoPlaying = false; // To track if the video is currently playing

// Object to store reaction counts for each story
let storyReactions = {
    heart: 0,
    comment: 0,
    share: 0
};

// To store comments for the story (this could be stored in the backend)
let storyComments = [];

document.addEventListener("DOMContentLoaded", function () {
    const prevButton = document.getElementById("prevStory");
    const nextButton = document.getElementById("nextStory");
    const storiesContainer = document.getElementById("storiesContainer");

    // Initially hide the prev button and next button if no stories
    prevButton.style.display = "none";
    nextButton.style.display = "none";

    // Function to check if there are any stories in the container
    function hasStories() {
        return storiesContainer.children.length > 0;
    }

    // Enable scrolling only if there are stories
    if (hasStories()) {
        nextButton.style.display = "flex"; // Show the next button if stories exist

        nextButton.addEventListener("click", () => {
            const maxScrollLeft = storiesContainer.scrollWidth - storiesContainer.clientWidth;
            const currentScrollLeft = storiesContainer.scrollLeft;

            // Check if not reached the end, then scroll
            if (currentScrollLeft < maxScrollLeft) {
                storiesContainer.scrollBy({ left: 100, behavior: "smooth" });
            }

            // Show the prev button when next is clicked
            prevButton.style.display = "flex";

            // Hide the next button if reached the end
            if (currentScrollLeft + 100 >= maxScrollLeft) {
                nextButton.style.display = "none";
            }
        });

        prevButton.addEventListener("click", () => {
            const currentScrollLeft = storiesContainer.scrollLeft;

            storiesContainer.scrollBy({ left: -100, behavior: "smooth" });

            // Hide the prev button if scrolled back to the start
            if (currentScrollLeft <= 100) {
                prevButton.style.display = "none";
            }

            // Show the next button when scrolled back from the start
            nextButton.style.display = "flex";
        });
    }
});

// Open Story Viewer (Display Media and Audio)
function openStoryViewer(story) {
    const viewer = document.getElementById('storyViewer');
    const viewerImage = document.getElementById('viewerImage');
    const viewerVideo = document.getElementById('viewerVideo');
    const storyContent = document.querySelector('.story-viewer-content'); // To append/remove audio dynamically

    viewer.style.display = 'block'; // Ensure the viewer is shown

    viewerImage.style.display = 'none';
    viewerVideo.style.display = 'none';

    // Clear any existing audio player before adding a new one
    let existingAudioPlayer = document.getElementById('viewerAudio');
    if (existingAudioPlayer) {
        existingAudioPlayer.remove(); // Remove the old audio player
    }

    // Check if the story is an image or video
    if (story.type === 'image') {
        viewerImage.src = story.url;
        viewerImage.style.display = 'block';
    } else if (story.type === 'video') {
        viewerVideo.src = story.url;
        viewerVideo.style.display = 'block';
        viewerVideo.currentTime = story.trimmedStart || 0;
        viewerVideo.play();

        // Stop playing beyond the trimmed end
        viewerVideo.ontimeupdate = function () {
            if (viewerVideo.currentTime >= story.trimmedEnd) {
                viewerVideo.pause();
            }
        };
    }

    // If the story has background music (audio)
    if (story.audioUrl) {
        // Create audio player dynamically
        const audioPlayer = document.createElement('audio');
        audioPlayer.id = 'viewerAudio';
        audioPlayer.controls = false;  // Hide controls
        audioPlayer.style.display = 'none';  // Hide the audio player
        storyContent.appendChild(audioPlayer);

        // Set the audio source and play it
        audioPlayer.src = story.audioUrl;
        audioPlayer.play().catch((error) => {
            console.log('Audio play error:', error);  // Handle any errors
        });

        // Ensure the audio doesn't overlap if there are multiple stories playing
        audioPlayer.onended = function () {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        };
    }

    // Update progress bar and indicators
    updateProgressBar();
}



// Close Story Viewer
document.getElementById('closeViewer').addEventListener('click', function () {
    document.getElementById('storyViewer').style.display = 'none';
    const viewerVideo = document.getElementById('viewerVideo');
    viewerVideo.pause();
    viewerVideo.currentTime = 0;
    viewerVideo.src = ''; // Fully stop video playback
});


// Posting in News Feed 
function addPost() {
    const textInput = document.getElementById('postText');
    const mediaInput = document.getElementById('mediaInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay'); // For showing file names
    const text = textInput?.value.trim() || ''; // Get text input (trim whitespace)
    const files = mediaInput.files;

    if (!text && files.length === 0) {
        alert('Write something or add a media file.');
        return;
    }

    const postContainer = document.getElementById('postsContainer');
    const post = document.createElement('div');
    post.classList.add('post');

    if (text) {
        post.innerHTML += `<p>${text}</p>`;
    }

    if (files.length > 0) {
        let fileNames = []; // Store filenames

        for (let file of files) {
            fileNames.push(file.name); // Add filename to list

            if (file.type.startsWith('image')) {
                post.innerHTML += `<img src="${URL.createObjectURL(file)}">`;
            } else if (file.type.startsWith('video')) {
                post.innerHTML += `<video src="${URL.createObjectURL(file)}" controls></video>`;
            }
        }

        // Display filenames
        fileNameDisplay.innerText = `Uploaded: ${fileNames.join(', ')}`;
        
        // Enable overflow whenever a media is uploaded
        document.body.style.overflow = 'auto';  // Enable overflow to allow scrolling
    } else {
        fileNameDisplay.innerText = ''; // Clear filename display if no file is uploaded
    }

    postContainer.prepend(post);

    // **Clear input fields after posting**
    textInput.value = ''; // Clear text input
    mediaInput.value = ''; // Clear file input
    fileNameDisplay.innerText = ''; // Clear file name display

    // Check if there are 3 or more posts in the feed
    if (postContainer.children.length >= 3) {
        document.body.style.overflow = 'auto';  // Enable overflow when there are 3 posts
    }
}

// Function to update filename display when a file is selected
document.getElementById('mediaInput').addEventListener('change', function () {
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const files = this.files;
    let fileNames = [];

    for (let file of files) {
        fileNames.push(file.name);
    }

    fileNameDisplay.innerText = fileNames.length > 0 ? `Selected: ${fileNames.join(', ')}` : '';
});

document.getElementById('nextStoryView').addEventListener('click', function () {
    if (currentStoryIndex < stories.length - 1) {
        currentStoryIndex++;
        updateStoryViewer();
    }
});

document.getElementById('prevStoryView').addEventListener('click', function () {
    if (currentStoryIndex > 0) {
        currentStoryIndex--;
        updateStoryViewer();
    }
});

document.getElementById('closeViewer').addEventListener('click', function () {
    document.getElementById('storyViewer').style.display = 'none';
    document.getElementById('viewerVideo').pause();
});


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
    const audioInput = document.getElementById('audioInput');  // New input for background music
    const textInput = document.getElementById('storyTitleModal');
    const file = fileInput.files[0];
    const audioFile = audioInput.files[0];  // Get the audio file

    if (!file) {
        alert("Please select a file.");
        return;
    }

    const storyContainer = document.getElementById('storiesContainer');
    const story = document.createElement('div');
    story.classList.add('story');

    let finalMedia;
    let finalAudio;
    let storyData = { 
        type: '', 
        url: '', 
        trimmedStart: 0, 
        trimmedEnd: 0,
        audioUrl: '' // New field for audio URL
    };

    // Handle Media (Image/Video)
    if (file.type.startsWith('image') && cropper) {
        const canvas = cropper.getCroppedCanvas();
        finalMedia = canvas.toDataURL();
        storyData.type = 'image';
        storyData.url = finalMedia;
    } else if (file.type.startsWith('video') && trimmedBlob) {
        finalMedia = URL.createObjectURL(trimmedBlob);
        storyData.type = 'video';
        storyData.url = finalMedia;
        storyData.trimmedStart = trimmedStartTime;
        storyData.trimmedEnd = trimmedEndTime;
    } else {
        finalMedia = URL.createObjectURL(file);
        storyData.type = file.type.startsWith('image') ? 'image' : 'video';
        storyData.url = finalMedia;
    }

    // Handle Audio File
    if (audioFile) {
        finalAudio = URL.createObjectURL(audioFile);
        storyData.audioUrl = finalAudio;  // Store the audio URL in story data
    }

    // Create Story Element
    const mediaElement = document.createElement(file.type.startsWith('image') ? 'img' : 'video');
    mediaElement.src = finalMedia;
    mediaElement.alt = 'Story Media';
    mediaElement.classList.add('story-media');

    if (storyData.type === 'video') {
        mediaElement.controls = true;
    }

    mediaElement.onclick = () => openStoryViewer(storyData);

    // Append Story to Container
    story.appendChild(mediaElement);

    // If there's an audio file, add an icon or element to indicate background music
    if (storyData.audioUrl) {
        const audioIcon = document.createElement('span');
        audioIcon.classList.add('audio-icon');
        audioIcon.innerText = '🎵'; // Musical note icon
        story.appendChild(audioIcon);
    }

    storyContainer.appendChild(story);

    // Store story in the list
    stories.push(storyData);

    // **Clear selected files after upload**
    fileInput.value = ''; // Clear file input
    audioInput.value = ''; // Clear audio input
    textInput.value = ''; // Clear title input

    closeStoryUpload();
}


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
        const videoContainer = document.createElement('div');
        videoContainer.style.textAlign = 'center';

        // Create video element
        const videoElement = document.createElement('video');
        videoElement.src = url;
        videoElement.controls = true;
        videoElement.style.maxWidth = '100%';
        videoElement.style.maxHeight = '300px';
        videoElement.id = "trimVideoElement"; // ID for trimming

        // Create trim controls
        const trimControls = document.createElement('div');
        trimControls.innerHTML = `
            <label>Start Time (seconds): <input type="number" id="trimStart" min="0" step="0.1"></label>
            <label>End Time (seconds): <input type="number" id="trimEnd" min="0" step="0.1"></label>
            <button onclick="applyTrim()">Apply Trim</button>
        `;
        trimControls.style.marginTop = "10px";

        videoContainer.appendChild(videoElement);
        videoContainer.appendChild(trimControls);
        previewContainer.appendChild(videoContainer);

        // Enable trim button only if a video is loaded
        videoElement.addEventListener('loadedmetadata', () => {
            document.getElementById('trimEnd').max = videoElement.duration;
        });
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

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const currentStory = stories[currentStoryIndex];
    const viewerVideo = document.getElementById('viewerVideo');

    progressBar.style.width = '0%'; // Reset the progress bar at the start

    if (currentStory.type === 'image') {
        let duration = 5; // Auto-advance after 5 seconds
        let startTime = Date.now();

        let interval = setInterval(() => {
            let elapsedTime = (Date.now() - startTime) / 1000;
            let progress = (elapsedTime / duration) * 100;
            progressBar.style.width = progress + '%';

            if (elapsedTime >= duration) {
                clearInterval(interval);
                goToNextStory();
            }
        }, 100);
    } else if (currentStory.type === 'video') {
        // Only change the video source if it's not already set
        if (!viewerVideo.src || viewerVideo.src !== currentStory.url) {
            viewerVideo.src = currentStory.url; // Set video source if not already set
            viewerVideo.load();  // Ensure the video loads correctly
        }

        // Set video time to the last known video time when switching to a new story
        viewerVideo.currentTime = currentVideoTime;

        // If the video was playing before, resume playback
        if (isVideoPlaying) {
            viewerVideo.play();
        }

        viewerVideo.addEventListener('timeupdate', function () {
            // Update the progress bar as the video plays
            let progress = (viewerVideo.currentTime / viewerVideo.duration) * 100;
            progressBar.style.width = progress + '%';

            // Sync current video time
            currentVideoTime = viewerVideo.currentTime;

            // If video ends, go to the next story
            if (viewerVideo.currentTime >= viewerVideo.duration - 0.5) {
                goToNextStory();
            }
        });
    }
}

function goToNextStory() {
    if (currentStoryIndex < stories.length - 1) {
        currentStoryIndex++;
        updateStoryViewer(); // Update the viewer with the next story
    } else {
        closeStoryViewer(); // Close viewer if it's the last story
    }
}

function goToPrevStory() {
    if (currentStoryIndex > 0) {
        currentStoryIndex--;
        updateStoryViewer(); // Update the viewer with the previous story
    }
}

function closeStoryViewer() {
    const viewer = document.getElementById('storyViewer');
    const viewerVideo = document.getElementById('viewerVideo');
    const audioPlayer = document.getElementById('viewerAudio'); // Audio player element

    // Hide the story viewer
    viewer.style.display = 'none';
    
    // Pause the video and reset it
    if (viewerVideo) {
        viewerVideo.pause();
        viewerVideo.currentTime = 0;  // Reset the video time
    }

    // Stop and reset the audio if it exists
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;  // Reset the audio playback
    }

    isVideoPlaying = false;  // Mark the video as paused
    currentVideoTime = viewerVideo ? viewerVideo.currentTime : 0; // Save current time of video to resume

    // You can also reset any other state variables if needed
}


function updateStoryViewer() {
    if (stories.length === 0) return;

    const viewerImage = document.getElementById('viewerImage');
    const viewerVideo = document.getElementById('viewerVideo');

    const currentStory = stories[currentStoryIndex];

    // Hide both image and video elements initially
    viewerImage.style.display = 'none';
    viewerVideo.style.display = 'none';

    if (currentStory.type === 'image') {
        viewerImage.src = currentStory.url;
        viewerImage.style.display = 'block';
        updateProgressBar(); // No video to sync, but we update progress for images
    } else if (currentStory.type === 'video') {
        viewerVideo.src = currentStory.url;
        viewerVideo.style.display = 'block';
        updateProgressBar(); // Start updating the progress bar when a video is loaded
    }
}

document.getElementById('nextStoryView').addEventListener('click', goToNextStory);
document.getElementById('prevStoryView').addEventListener('click', goToPrevStory);

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
    const video = document.querySelector('video');
    if (!video || !video.src) {
        alert('No video to trim.');
        return;
    }

    trimmedStartTime = prompt('Enter start time in seconds:', '0');
    trimmedEndTime = prompt('Enter end time in seconds:', `${video.duration}`);

    trimmedStartTime = parseFloat(trimmedStartTime);
    trimmedEndTime = parseFloat(trimmedEndTime);

    if (isNaN(trimmedStartTime) || isNaN(trimmedEndTime) || trimmedStartTime >= trimmedEndTime) {
        alert('Invalid trim times.');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const mediaRecorder = new MediaRecorder(video.captureStream());

    const chunks = [];
    mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
    mediaRecorder.onstop = () => {
        trimmedBlob = new Blob(chunks, { type: 'video/mp4' });
    };

    mediaRecorder.start();
    video.currentTime = trimmedStartTime;

    video.ontimeupdate = () => {
        if (video.currentTime >= trimmedEndTime) {
            mediaRecorder.stop();
            video.ontimeupdate = null;
        }
    };
}

// Function to apply trimming logic
function applyTrim() {
    const video = document.getElementById('trimVideoElement');
    const start = parseFloat(document.getElementById('trimStart').value);
    const end = parseFloat(document.getElementById('trimEnd').value);

    if (start >= end || start < 0 || end > video.duration) {
        alert("Invalid trim range.");
        return;
    }

    video.currentTime = start;

    const stream = video.captureStream();
    const mediaRecorder = new MediaRecorder(stream);
    let chunks = [];

    mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        trimmedBlob = new Blob(chunks, { type: "video/mp4" });
    };

    video.play();
    mediaRecorder.start();

    setTimeout(() => {
        mediaRecorder.stop();
        video.pause();
    }, (end - start) * 1000);
}

/* Reaction Buttons */

function reactToStory(reactionType) {
    // Increment the count based on the reaction type
    if (storyReactions[reactionType] !== undefined) {
        storyReactions[reactionType]++;
    }

    // Update the UI with the new count for each reaction
    document.getElementById(`${reactionType}Count`).innerText = storyReactions[reactionType];

    // Save the reaction (this is a placeholder for actual saving logic)
    saveReactionToStory(reactionType);
}

function saveReactionToStory(reactionType) {
    // Here you can implement the logic to save the reaction to a backend or local storage
    console.log(`Saved ${reactionType} reaction to the story.`);
}

// Toggle the visibility of the comment section
function toggleCommentSection() {
    const commentSection = document.getElementById('commentSection');
    const isVisible = commentSection.style.display === 'block';
    commentSection.style.display = isVisible ? 'none' : 'block';
}

// Submit the comment
function submitComment() {
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();

    if (commentText) {
        // Add the comment to the list
        storyComments.push(commentText);
        
        // Update the comment list UI
        displayComments();

        // Clear the comment input field
        commentInput.value = '';

        // Optionally, you can save the comment to the backend or local storage
        saveCommentToStory(commentText);
    }
}

// Display the list of comments under the story
function displayComments() {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = ''; // Clear existing comments

    // Create and append each comment to the list
    storyComments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment');
        commentDiv.textContent = comment;
        commentsList.appendChild(commentDiv);
    });

    // Update the comment count
    document.getElementById('commentCount').innerText = storyComments.length;
}

// Save the comment (placeholder for backend logic)
function saveCommentToStory(commentText) {
    console.log(`Saved comment: "${commentText}" to the story.`);
}

function previewAudio() {
    const audioInput = document.getElementById('audioInput');
    const audioPreview = document.getElementById('audioPreview');
    const audioSource = document.getElementById('audioSource');

    if (audioInput.files && audioInput.files[0]) {
        const fileURL = URL.createObjectURL(audioInput.files[0]);
        audioSource.src = fileURL;
        audioPreview.style.display = 'block'; // Show the audio player
        audioPreview.load(); // Load the audio file for preview
    }
}
