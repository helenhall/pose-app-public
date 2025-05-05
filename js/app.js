/*
 * app.js - main js file
 */

// Application state
const appState = {
  stickFigure: null,
  dataLoader: null,
  poseMatcher: null,
  poseData: [],
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
  dataFileInput: document.getElementById("dataFileInput"),
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
  appState.poseData = appState.dataLoader.sampleData;

  // appState.poseData = appState.dataLoader.loadFromFile(
  //   "../data/full-size-detected.json"
  // );
  // Set up event listeners
  setupEventListeners();

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

  // File input - allows uploading custom MoveNet data
  elements.dataFileInput.addEventListener("change", handleFileUpload);
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

//Display Results - displays the similar poses found in the results gallery
// This function is called after finding similar poses
function displayResults() {
  clearResults();

  if (appState.similarPoses.length === 0) {
    elements.resultGallery.innerHTML =
      '<div class="no-results">No similar poses found. Try adjusting the similarity threshold.</div>';
    return;
  }

  appState.similarPoses.forEach((result, index) => {
    // Create result container
    const resultItem = document.createElement("div");
    resultItem.className = "result-item";

    //add image
    const imgElement = document.createElement("img");
    // basepath = "https://ik.imagekit.io/helenrhall/Thumbnails/";
    basepath = "https://ik.imagekit.io/helenrhall/YUAG_Results_2/";

    imgElement.src = basepath + result.filename;
    imgElement.className = "pose-image";
    resultItem.appendChild(imgElement);
    // Create small canvas for this result
    // const resultCanvas = document.createElement("canvas");
    // resultCanvas.width = 150;
    // resultCanvas.height = 150;
    // resultItem.appendChild(resultCanvas);

    // Add similarity score
    const scoreElement = document.createElement("div");
    scoreElement.className = "similarity-score";
    scoreElement.textContent = `Similarity: ${Math.round(
      result.similarity * 100
    )}%`;
    resultItem.appendChild(scoreElement);

    // Add filename
    const filenameElement = document.createElement("div");
    filenameElement.className = "pose-filename";
    filenameElement.textContent = result.filename || `Pose #${index + 1}`;
    resultItem.appendChild(filenameElement);

    // Add to gallery
    elements.resultGallery.appendChild(resultItem);

    // Draw stick figure on this canvas
    // drawPoseOnCanvas(resultCanvas, result.keypoints);
  });
}
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

// Initialize the application when the page loads
document.addEventListener("DOMContentLoaded", initApp);
