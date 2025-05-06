/*
 * app.js - main js file
 */

// adding for carousel
let currentImageIndex = 0;

// Application state
const appState = {
  stickFigure: null,
  dataLoader: null,
  poseMatcher: null,
  poseData: [],
  basepath: null,
  similarPoses: [],
  sensitivityThreshold: 0.7,
  maxResults: 10,
  isLoading: false,
};

// DOM elements
const elements = {
  canvas: document.getElementById("stickFigureCanvas"),
  resetButton: document.getElementById("resetButton"),
  randomButton: document.getElementById("randomButton"),
  findButton: document.getElementById("findButton"),
  sensitivitySlider: document.getElementById("sensitivitySlider"),
  sensitivityValue: document.getElementById("sensitivityValue"),
  maxResultsSlider: document.getElementById("maxResultsSlider"),
  maxResultsValue: document.getElementById("maxResultsValue"),
  // imageUrlInput: document.getElementById("imageUrlInput"),
  // jsonUrlInput: document.getElementById("jsonUrlInput"),
  urlButton: document.getElementById("loadUrlButton"),
  // dataFileInput: document.getElementById("dataFileInput"),
  resultGallery: document.getElementById("resultGallery"),
  loadingOverlay: document.getElementById("loadingOverlay"),
};

//Start with initializing
function initApp() {
  // Initialize stick figure
  appState.stickFigure = new StickFigure("stickFigureCanvas");

  // Initialize data loader
  appState.dataLoader = new DataLoader();

  // Initialize pose matcher
  appState.poseMatcher = new PoseMatcher();

  // Set initial pose data (sample data from DataLoader before user uploads)
  // appState.poseData = appState.dataLoader.sampleData;
  toggleLoading(true);
  appState.dataLoader
    .loadFromUrl(
      "https://ik.imagekit.io/hrh24/full-size-detected.json?updatedAt=1746561024239"
    )
    .then((poseData) => {
      appState.poseData = poseData;
      // Set basepath for images initially
      appState.basepath = "https://ik.imagekit.io/helenrhall/Thumbnails/";
      console.log(`Preloaded ${poseData.length} poses from URL`);
    })
    .catch((err) => {
      console.warn("Using fallback sample data due to load error:", err);
      appState.poseData = appState.dataLoader.sampleData;
    });
  // toggleLoading(false);
  // appState.poseData = appState.dataLoader.loadFromFile(
  //   "../data/full-size-detected.json"
  // );
  // Set up event listeners
  setupEventListeners();
  setupModalEventListeners();

  // Hide loading overlay initially
  toggleLoading(false);
}

//Event listeners for buttons and sliders
function setupEventListeners() {
  // Reset button - resets the stick figure to default pose
  elements.resetButton.addEventListener("click", () => {
    appState.stickFigure.resetPose();
  });

  // Random button - sets the stick figure to a random pose
  elements.randomButton.addEventListener("click", () => {
    appState.stickFigure.generateRandomPose();
  });

  // Find button - finds similar poses based on current stick figure pose
  elements.findButton.addEventListener("click", findSimilarPoses);

  // Sensitivity slider - updates threshold for similarity matching
  elements.sensitivitySlider.addEventListener("input", (e) => {
    appState.sensitivityThreshold = parseFloat(e.target.value);
    elements.sensitivityValue.textContent = appState.sensitivityThreshold;
    appState.poseMatcher.setSensitivity(appState.sensitivityThreshold);
  });

  // Max results slider - updates maximum number of results to display
  elements.maxResultsSlider.addEventListener("input", (e) => {
    appState.maxResults = parseInt(e.target.value);
    elements.maxResultsValue.textContent = appState.maxResults;
    appState.poseMatcher.setMaxResults(appState.maxResults);
  });

  // URL button - loads pose data from a URL added
  document.getElementById("loadUrlButton").addEventListener("click", () => {
    const imageUrl = document.getElementById("imageUrlInput").value.trim();
    const jsonUrl = document.getElementById("jsonUrlInput").value.trim();
    const errorMessage = document.getElementById("urlErrorMessage");

    if (!imageUrl || !jsonUrl) {
      errorMessage.textContent =
        "Please enter both an image URL and a JSON URL.";
      return;
    }

    errorMessage.textContent = ""; // Clear error
    console.log("Image URL:", imageUrl);
    console.log("JSON URL:", jsonUrl);
    // now actually load the pose
    toggleLoading(true);
    appState.dataLoader
      .loadFromUrl(jsonUrl)
      .then((poseData) => {
        appState.poseData = poseData;

        console.log(`Loaded ${poseData.length} poses from URL`);
        // Clear any previous results
        clearResults();
        toggleLoading(false);
        // check if len of poseData is 0
        if (poseData.length === 0) {
          alert("No poses found in the provided JSON URL.");
          return;
        }
        // Notify user of successful load
        //when works then need to get the image link
        //start by just checking if the image link is valid
        //have to get first image from the poseData
        const firstPose = poseData[0];
        const firstPoseImage = imageUrl + firstPose.filename;
        const img = new Image();
        img.src = firstPoseImage;
        img.onload = () => {
          console.log("Image loaded successfully:", firstPoseImage);
          // set as basepath
          appState.basepath = imageUrl;
          console.log("Basepath set to:", appState.basepath);
        };
        img.onerror = () => {
          console.error("Error loading image:", firstPoseImage);
          alert(
            "Error loading image. Please check the image URL and try again."
          );
        };
        // const img = new Image();
        alert(`Successfully loaded ${poseData.length} poses from URL.`);
      })
      .catch((error) => {
        console.error("Error loading pose data from URL:", error);
        toggleLoading(false);
        alert(
          "Error loading pose data. Please check the JSON URL and try again."
        );
      });
  });
  // console.log(image_url.value, json_url.value);
  // if (!image_url || !json_url) {
  //   alert("Please enter both image URL and JSON URL.");
  //   console.error(
  //     image_url.value,
  //     json_url.value,
  //     "Image or JSON URL is empty."
  //   );
  //   return;
  // }
  //   //else they're there need to load pose
  //   toggleLoading(true);
  //   appState.dataLoader.loadFromUrl(json_url.value).then((poseData) => {
  //     appState.poseData = poseData;
  //     console.log(`Loaded ${poseData.length} poses from URL`);
  //     // Clear any previous results
  //     clearResults();
  //     toggleLoading(false);
  //     // Notify user of successful load
  //     alert(`Successfully loaded ${poseData.length} poses from URL.`);
  //   });
  // });

  // File input - allows uploading custom MoveNet data
  // elements.dataFileInput.addEventListener("change", handleFileUpload);
}

//File upload - will use dataLoader to load the file but fun UI
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    toggleLoading(true);
    appState.poseData = await appState.dataLoader.loadFromFile(file);
    console.log(`Loaded ${appState.poseData.length} poses from uploaded file`);

    // Clear any previous results
    clearResults();
    toggleLoading(false);

    // Notify user of successful upload
    alert(`Successfully loaded ${appState.poseData.length} poses from file.`);
  } catch (error) {
    console.error("Error loading pose data from file:", error);
    toggleLoading(false);
    alert(
      "Error loading file. Please check that it contains valid MoveNet pose data in JSON format."
    );
  }
}

//Find Similar Poses - uses the PoseMatcher to find similar poses based on current stick figure pose
function findSimilarPoses() {
  if (appState.poseData.length === 0) {
    alert("No pose data available. Please upload MoveNet data first.");
    return;
  }

  try {
    toggleLoading(true);

    // Get current pose from stick figure
    const currentPose = appState.stickFigure.getKeypoints();
    // Find similar poses using the PoseMatcher
    appState.similarPoses = appState.poseMatcher.findSimilarPoses(
      currentPose,
      appState.poseData
    );

    // Display results
    displayResults();

    toggleLoading(false);
  } catch (error) {
    console.error("Error finding similar poses:", error);
    toggleLoading(false);
    alert("Error finding similar poses. Please try again.");
  }
}

//updated display results
function displayResults() {
  clearResults();

  if (appState.similarPoses.length === 0) {
    elements.resultGallery.innerHTML =
      '<div class="no-results">No similar poses found. Try adjusting the similarity threshold.</div>';
    return;
  }

  appState.similarPoses.forEach((result, index) => {
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";

    const imgElement = document.createElement("img");
    const basepath = appState.basepath;
    const fullImageSrc = basepath + result.filename;

    imgElement.src = fullImageSrc;
    imgElement.className = "pose-image";
    imgElement.style.cursor = "pointer";

    // Open modal on click
    imgElement.addEventListener("click", () => openModal(index));

    resultItem.appendChild(imgElement);

    const scoreElement = document.createElement("div");
    scoreElement.className = "similarity-score";
    scoreElement.textContent = `Similarity: ${Math.round(
      result.similarity * 100
    )}%`;
    resultItem.appendChild(scoreElement);

    const filenameElement = document.createElement("div");
    filenameElement.className = "pose-filename";
    filenameElement.textContent = result.filename || `Pose #${index + 1}`;
    resultItem.appendChild(filenameElement);

    elements.resultGallery.appendChild(resultItem);
  });
}
//Display Results - displays the similar poses found in the results gallery
// This function is called after finding similar poses
// function displayResults() {
//   clearResults();

//   if (appState.similarPoses.length === 0) {
//     elements.resultGallery.innerHTML =
//       '<div class="no-results">No similar poses found. Try adjusting the similarity threshold.</div>';
//     return;
//   }

//   appState.similarPoses.forEach((result, index) => {
//     // Create result container
//     const resultItem = document.createElement("div");
//     resultItem.className = "result-item";

//     //add image
//     const imgElement = document.createElement("img");
//     // basepath = "https://ik.imagekit.io/helenrhall/Thumbnails/";
//     // basepath = "https://ik.imagekit.io/helenrhall/YUAG_Results_2/";
//     basepath = appState.basepath;

//     imgElement.src = basepath + result.filename;
//     imgElement.className = "pose-image";
//     resultItem.appendChild(imgElement);
//     // Create small canvas for this result
//     // const resultCanvas = document.createElement("canvas");
//     // resultCanvas.width = 150;
//     // resultCanvas.height = 150;
//     // resultItem.appendChild(resultCanvas);

//     // Add similarity score
//     const scoreElement = document.createElement("div");
//     scoreElement.className = "similarity-score";
//     scoreElement.textContent = `Similarity: ${Math.round(
//       result.similarity * 100
//     )}%`;
//     resultItem.appendChild(scoreElement);

//     // Add filename
//     const filenameElement = document.createElement("div");
//     filenameElement.className = "pose-filename";
//     filenameElement.textContent = result.filename || `Pose #${index + 1}`;
//     resultItem.appendChild(filenameElement);

//     // Add to gallery
//     elements.resultGallery.appendChild(resultItem);

//     // Draw stick figure on this canvas
//     // drawPoseOnCanvas(resultCanvas, result.keypoints);
//   });
// }
// Draw Pose on Canvas - draws the stick figure on the canvas
function drawPoseOnCanvas(canvas, keypoints) {
  const ctx = canvas.getContext("2d");
  const scaleFactor = Math.min(canvas.width, canvas.height) / 500;

  // Clear canvas
  //   ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Center the figure
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scaleFactor, scaleFactor);

  // Draw connections (lines)
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 3;

  // Define connections between keypoints for drawing stick figure
  const connections = {
    head: ["neck"],
    neck: ["leftShoulder", "rightShoulder", "hip"],
    leftShoulder: ["leftElbow"],
    rightShoulder: ["rightElbow"],
    leftElbow: ["leftWrist"],
    rightElbow: ["rightWrist"],
    hip: ["leftKnee", "rightKnee"],
    leftKnee: ["leftAnkle"],
    rightKnee: ["rightAnkle"],
  };

  // Draw lines between connected keypoints
  for (const jointName in connections) {
    const joint = keypoints[jointName];
    if (joint) {
      for (const connectedJointName of connections[jointName]) {
        const connectedJoint = keypoints[connectedJointName];
        if (connectedJoint) {
          ctx.beginPath();
          ctx.moveTo(joint.x - 250, joint.y - 200);
          ctx.lineTo(connectedJoint.x - 250, connectedJoint.y - 200);
          ctx.stroke();
        }
      }
    }
  }

  // Draw head (special case - larger circle)
  if (keypoints.head) {
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(keypoints.head.x - 250, keypoints.head.y - 200, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw joints (circles)
  for (const jointName in keypoints) {
    if (jointName === "head") continue; // Skip head as we've already drawn it

    const joint = keypoints[jointName];
    if (joint) {
      ctx.fillStyle = "#FF6600";
      ctx.beginPath();
      ctx.arc(joint.x - 250, joint.y - 200, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Reset transformation
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

//Clear results when eneded
function clearResults() {
  elements.resultGallery.innerHTML = "";
}

//Load the spinner
function toggleLoading(isLoading) {
  appState.isLoading = isLoading;
  elements.loadingOverlay.style.display = isLoading ? "flex" : "none";
}

// adding modal things:
// Modal functionality

// Open the modal with a specific image
function openModal(index) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const captionText = document.getElementById("modalCaption");

  // Set the current image index
  currentImageIndex = index;

  // Get the selected pose result
  const selectedPose = appState.similarPoses[index];

  // Set the image source and caption
  modalImg.src = appState.basepath + selectedPose.filename;
  captionText.textContent = `${
    selectedPose.filename
  } - Similarity: ${Math.round(selectedPose.similarity * 100)}%`;

  // Display the modal
  modal.style.display = "block";

  // Update navigation buttons visibility
  updateNavigationButtons();
}

// Close the modal
function closeModal() {
  const modal = document.getElementById("imageModal");
  modal.style.display = "none";
}

// Navigate to the previous image
function showPreviousImage() {
  if (currentImageIndex > 0) {
    currentImageIndex--;
    openModal(currentImageIndex);
  }
}

// Navigate to the next image
function showNextImage() {
  if (currentImageIndex < appState.similarPoses.length - 1) {
    currentImageIndex++;
    openModal(currentImageIndex);
  }
}

// Update the visibility of navigation buttons based on current position
function updateNavigationButtons() {
  const prevButton = document.getElementById("prevImage");
  const nextButton = document.getElementById("nextImage");

  // Hide or show previous button
  prevButton.style.visibility = currentImageIndex > 0 ? "visible" : "hidden";

  // Hide or show next button
  nextButton.style.visibility =
    currentImageIndex < appState.similarPoses.length - 1 ? "visible" : "hidden";
}

// Set up modal event listeners
function setupModalEventListeners() {
  // Close button event listener
  document.getElementById("closeModal").addEventListener("click", closeModal);

  // Previous button event listener
  document
    .getElementById("prevImage")
    .addEventListener("click", showPreviousImage);

  // Next button event listener
  document.getElementById("nextImage").addEventListener("click", showNextImage);

  // Close modal when clicking outside the image
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("imageModal");
    if (event.target === modal) {
      closeModal();
    }
  });

  // Keyboard navigation
  document.addEventListener("keydown", (event) => {
    if (document.getElementById("imageModal").style.display === "block") {
      if (event.key === "ArrowLeft") {
        showPreviousImage();
      } else if (event.key === "ArrowRight") {
        showNextImage();
      } else if (event.key === "Escape") {
        closeModal();
      }
    }
  });
}

// Initialize the application when the page loads
document.addEventListener("DOMContentLoaded", initApp);
