// poseMatcher.js
class PoseMatcher {
  constructor() {
    this.sensitivity = 0.7;
    this.maxResults = 10;
  }

  // Set sensitivity threshold
  setSensitivity(value) {
    this.sensitivity = value;
  }

  // Set max results to return
  setMaxResults(value) {
    this.maxResults = value;
  }

  /**
   * Normalize a pose to make comparison scale-invariant
   * @param {Object} pose - Object with keypoints
   * @returns {Object} - Normalized pose
   */
  normalizePose(pose) {
    // Calculate the center of mass
    let centerX = 0,
      centerY = 0,
      n = 0;
    for (const joint in pose) {
      centerX += pose[joint].x;
      centerY += pose[joint].y;
      n++;
    }
    centerX /= n;
    centerY /= n;

    // Calculate average distance from center
    let avgDist = 0;
    for (const joint in pose) {
      const dx = pose[joint].x - centerX;
      const dy = pose[joint].y - centerY;
      avgDist += Math.sqrt(dx * dx + dy * dy);
    }
    avgDist /= n;

    // Normalize
    const normalized = {};
    for (const joint in pose) {
      normalized[joint] = {
        x: (pose[joint].x - centerX) / avgDist,
        y: (pose[joint].y - centerY) / avgDist,
      };
    }

    return normalized;
  }

  /**
   * Calculate similarity between two poses
   * @param {Object} pose1 - First pose keypoints
   * @param {Object} pose2 - Second pose keypoints
   * @returns {number} - Similarity score between 0 and 1
   */
  calculateSimilarity(pose1, pose2) {
    let totalDistance = 0;
    let count = 0;

    const normalizedPose1 = this.normalizePose(pose1);
    console.log("Normalized Pose 1:", normalizedPose1);
    const normalizedPose2 = this.normalizePose(pose2);
    console.log("Normalized Pose 2:", normalizedPose2);

    // Calculate distance for each keypoint
    for (const joint in normalizedPose1) {
      if (normalizedPose2[joint]) {
        const dx = normalizedPose1[joint].x - normalizedPose2[joint].x;
        const dy = normalizedPose1[joint].y - normalizedPose2[joint].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }

    // Average distance (smaller is more similar)
    const avgDistance = totalDistance / count;

    // Convert to similarity score (1 is identical, 0 is completely different)
    const similarity = Math.max(0, 1 - avgDistance / 2);
    return similarity;
  }

  /**
   * Find similar poses in the dataset
   * @param {Object} queryPose - The pose to search for
   * @param {Array} poseData - Array of pose data objects
   * @returns {Array} - Sorted array of matches
   */
  findSimilarPoses(queryPose, poseData) {
    console.log("Finding similar poses...");
    console.log("Query Pose:", queryPose);
    // console.log("Pose Data:", poseData[0]); // Log first 5 for brevity
    // Calculate similarity score for each pose in the dataset
    const results = poseData.map((item) => {
      const score = this.calculateSimilarity(queryPose, item.keypoints);
      return {
        filename: item.filename,
        similarity: score,
        keypoints: item.keypoints, // Include keypoints in results
      };
    });

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Filter by threshold and limit by max results
    return results
      .filter((result) => result.similarity >= this.sensitivity)
      .slice(0, this.maxResults);
  }
}
