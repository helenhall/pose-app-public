//Use a dataloader class to load and process the JSON data given by user
class DataLoader {
  constructor() {
    this.poseData = [];
    this.imageBasePath = "";

    // Sample data - will use the first part of the full-size-detected.json
    this.sampleData = [
      {
        filename: "person1.jpg",
        keypoints: {
          head: { x: 250, y: 100 },
          neck: { x: 250, y: 130 },
          leftShoulder: { x: 220, y: 150 },
          rightShoulder: { x: 280, y: 150 },
          leftElbow: { x: 190, y: 180 },
          rightElbow: { x: 310, y: 180 },
          leftWrist: { x: 170, y: 220 },
          rightWrist: { x: 330, y: 220 },
          hip: { x: 250, y: 220 },
          leftKnee: { x: 230, y: 290 },
          rightKnee: { x: 270, y: 290 },
          leftAnkle: { x: 220, y: 350 },
          rightAnkle: { x: 280, y: 350 },
        },
      },
      // More sample data...
    ];
  }

  /**
   * Load data from JSON file
   * @param {File} file - The JSON file to load
   * @returns {Promise} - Promise resolving to the loaded data
   */
  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          this.processData(jsonData);
          resolve(this.poseData);
        } catch (error) {
          reject(`Error parsing JSON: ${error.message}`);
        }
      };

      reader.onerror = () => {
        reject("Error reading file");
      };

      reader.readAsText(file);
    });
  }

  /**
   * Process data into a format usable by the app
   * @param {Object} data - Raw JSON data
   */
  processData(data) {
    // Reset pose data
    this.poseData = [];
    console.log("Processing data:", data);

    // Check for the new format (filename.jpg keyed objects with keypoints in uppercase) aka mediapipe
    const isNewFormat = this.detectNewFormat(data);

    if (isNewFormat) {
      console.log("Detected new keypoint format");
      this.poseData = this.processNewFormat(data);
    }
    // Format 1: Array of images with pose keypoints
    else if (Array.isArray(data)) {
      this.poseData = data.map((item) => this.mapMoveNetToAppFormat(item));
    }
    // Format 2: Object with images array
    else if (data.images && Array.isArray(data.images)) {
      this.poseData = data.images.map((item) =>
        this.mapMoveNetToAppFormat(item)
      );
    }
    // Format 3: Legacy format with different structure
    else if (data.annotations) {
      // Handle legacy format (adjust this based on your actual data structure)
      this.poseData = Object.entries(data.annotations).map(
        ([filename, annotation]) => {
          return {
            filename,
            keypoints: this.extractKeypoints(annotation),
          };
        }
      );
    }
    // Format 4: Object with filename keys and keypoint values
    else if (typeof data === "object") {
      console.log("Data is an object");
      // Handle object format with keypoints
      // Assuming data is structured as { filename: { keypoints: {...} } }
      this.poseData = Object.entries(data).map(([filename, entry]) => ({
        filename,
        keypoints: this.mapMoveNetToAppFormat(entry).keypoints,
      }));
    }
    // Fallback to sample data if format isn't recognized
    else {
      console.warn("Unrecognized data format, using sample data");
      this.poseData = this.sampleData;
    }

    // Set image base path if provided
    if (data.baseImagePath) {
      this.imageBasePath = data.baseImagePath;
    }

    console.log(`Loaded ${this.poseData.length} pose entries`);
  }

  /**
   * Detect if data is in the new format (uppercase keypoint names)
   * @param {Object} data - Input data
   * @returns {Boolean} - True if data is in new format
   */
  detectNewFormat(data) {
    if (typeof data !== "object" || data === null) return false;

    // Check if first entry has uppercase keypoint names
    const firstKey = Object.keys(data)[0];
    if (!firstKey || !data[firstKey]) return false;

    // Check if it has the expected structure with uppercase keypoint names
    return (
      data[firstKey].keypoints &&
      Object.keys(data[firstKey].keypoints).some(
        (key) =>
          key === key.toUpperCase() &&
          ["NOSE", "LEFT_SHOULDER", "RIGHT_SHOULDER"].includes(key)
      )
    );
  }

  /**
   * Process data in new format (uppercase keypoint names)
   * @param {Object} data - Input data in new format
   * @returns {Array} - Processed pose data
   */
  processNewFormat(data) {
    return Object.entries(data).map(([filename, entry]) => {
      // Skip entries without keypoints or person
      if (!entry.keypoints || entry.has_person === false) {
        return {
          filename,
          keypoints: {},
        };
      }

      // Map the uppercase keypoint names to our format
      const keypoints = {};
      const keypointMap = {
        NOSE: "head",
        LEFT_EYE: "leftEye",
        RIGHT_EYE: "rightEye",
        LEFT_EAR: "leftEar",
        RIGHT_EAR: "rightEar",
        LEFT_SHOULDER: "leftShoulder",
        RIGHT_SHOULDER: "rightShoulder",
        LEFT_ELBOW: "leftElbow",
        RIGHT_ELBOW: "rightElbow",
        LEFT_WRIST: "leftWrist",
        RIGHT_WRIST: "rightWrist",
        LEFT_HIP: "leftHip",
        RIGHT_HIP: "rightHip",
        LEFT_KNEE: "leftKnee",
        RIGHT_KNEE: "rightKnee",
        LEFT_ANKLE: "leftAnkle",
        RIGHT_ANKLE: "rightAnkle",
        LEFT_HEEL: "leftHeel",
        RIGHT_HEEL: "rightHeel",
        LEFT_FOOT_INDEX: "leftFoot",
        RIGHT_FOOT_INDEX: "rightFoot",
      };

      // Map each keypoint
      Object.entries(entry.keypoints).forEach(([key, value]) => {
        // Only include if visibility is above threshold (if it exists)
        const threshold = 0.3; // Adjust this threshold as needed
        if (
          value &&
          (!value.hasOwnProperty("visibility") || value.visibility > threshold)
        ) {
          const mappedKey = keypointMap[key] || key.toLowerCase();
          keypoints[mappedKey] = {
            x: value.x,
            y: value.y,
          };
        }
      });

      // Add derived keypoints
      this.addDerivedKeypoints(keypoints);

      return {
        filename,
        keypoints,
        imageSize: entry.image_size, // Include image size if available
      };
    });
  }

  /**
   * Add derived keypoints like neck and hip based on other keypoints
   * @param {Object} keypoints - Keypoint object
   */
  addDerivedKeypoints(keypoints) {
    // Compute neck as average of shoulders if not present
    if (!keypoints.neck && keypoints.leftShoulder && keypoints.rightShoulder) {
      keypoints.neck = {
        x: (keypoints.leftShoulder.x + keypoints.rightShoulder.x) / 2,
        y: (keypoints.leftShoulder.y + keypoints.rightShoulder.y) / 2 - 10,
      };
    }

    // Compute hip as average of left and right hip if not present
    if (!keypoints.hip && keypoints.leftHip && keypoints.rightHip) {
      keypoints.hip = {
        x: (keypoints.leftHip.x + keypoints.rightHip.x) / 2,
        y: (keypoints.leftHip.y + keypoints.rightHip.y) / 2,
      };
    }

    // Use nose as head if needed
    if (keypoints.nose && !keypoints.head) {
      keypoints.head = { ...keypoints.nose };
    }
  }

  /**
   * Map MoveNet keypoints to our app format
   * @param {Object} moveNetItem - Item from MoveNet data
   * @returns {Object} - Mapped item in app format
   */
  mapMoveNetToAppFormat(moveNetItem) {
    console.log("Mapping MoveNet item to app format:", moveNetItem);
    const result = {
      filename: moveNetItem.filename || moveNetItem.image || "unknown.jpg",
      keypoints: {},
    };

    // MoveNet may have keypoints in different formats
    if (moveNetItem.keypoints) {
      // Map MoveNet keypoints to our format
      // MoveNet typically uses a flat array of keypoints
      const keypointMap = {
        0: "head", // nose in MoveNet
        1: "leftEye",
        2: "rightEye",
        3: "leftEar",
        4: "rightEar",
        5: "leftShoulder",
        6: "rightShoulder",
        7: "leftElbow",
        8: "rightElbow",
        9: "leftWrist",
        10: "rightWrist",
        11: "leftHip",
        12: "rightHip",
        13: "leftKnee",
        14: "rightKnee",
        15: "leftAnkle",
        16: "rightAnkle",
      };

      // If keypoints is an array (standard MoveNet format)
      if (Array.isArray(moveNetItem.keypoints)) {
        moveNetItem.keypoints.forEach((kp, index) => {
          const name = keypointMap[index];
          if (name) {
            result.keypoints[name] = {
              x: kp.x || kp[0],
              y: kp.y || kp[1],
            };
          }
        });

        // Add derived keypoints like neck and hip
        this.addDerivedKeypoints(result.keypoints);
      }
      // If keypoints is an object (alternative format)
      else if (typeof moveNetItem.keypoints === "object") {
        Object.entries(moveNetItem.keypoints).forEach(([name, kp]) => {
          result.keypoints[name] = {
            x: kp.x,
            y: kp.y,
          };
        });

        // Add derived keypoints like neck and hip
        this.addDerivedKeypoints(result.keypoints);
      }
    }

    return result;
  }

  /**
   * Extract keypoints from legacy annotation format
   * @param {Object} annotation - Annotation data
   * @returns {Object} - Keypoints in app format
   */
  extractKeypoints(annotation) {
    // This will depend on your specific annotation format
    // Example implementation:
    const keypoints = {};

    try {
      // Example mapping, adjust according to your format
      if (annotation.pose) {
        // Map standard body pose keypoints
        keypoints.head = annotation.pose.nose || { x: 0, y: 0 };
        keypoints.neck = annotation.pose.neck || { x: 0, y: 0 };
        keypoints.leftShoulder = annotation.pose.leftShoulder || { x: 0, y: 0 };
        keypoints.rightShoulder = annotation.pose.rightShoulder || {
          x: 0,
          y: 0,
        };
        keypoints.leftElbow = annotation.pose.leftElbow || { x: 0, y: 0 };
        keypoints.rightElbow = annotation.pose.rightElbow || { x: 0, y: 0 };
        keypoints.leftWrist = annotation.pose.leftWrist || { x: 0, y: 0 };
        keypoints.rightWrist = annotation.pose.rightWrist || { x: 0, y: 0 };
        keypoints.hip = annotation.pose.hip || { x: 0, y: 0 };
        keypoints.leftKnee = annotation.pose.leftKnee || { x: 0, y: 0 };
        keypoints.rightKnee = annotation.pose.rightKnee || { x: 0, y: 0 };
        keypoints.leftAnkle = annotation.pose.leftAnkle || { x: 0, y: 0 };
        keypoints.rightAnkle = annotation.pose.rightAnkle || { x: 0, y: 0 };
      }
    } catch (error) {
      console.error(`Error extracting keypoints: ${error.message}`);
    }
    return keypoints;
  }

  /**
   * Get all loaded pose data
   * @returns {Array} - Array of pose data objects
   */
  getPoseData() {
    return this.poseData;
  }

  /**
   * Get a specific pose by filename
   * @param {String} filename - Filename to search for
   * @returns {Object|null} - Pose data or null if not found
   */
  getPoseByFilename(filename) {
    return this.poseData.find((item) => item.filename === filename) || null;
  }
}

// Export the DataLoader class
// export default DataLoader;
