// StickFigure class to manage the stick figure drawing and interactions
class StickFigure {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // Default joints configuration
    this.defaultJoints = {
      head: { x: 250, y: 100, radius: 20, connections: ["neck"] },
      neck: {
        x: 250,
        y: 130,
        radius: 6,
        connections: ["leftShoulder", "rightShoulder"],
      },
      leftShoulder: {
        x: 220,
        y: 150,
        radius: 6,
        connections: ["leftElbow", "leftHip"],
      },
      rightShoulder: {
        x: 280,
        y: 150,
        radius: 6,
        connections: ["rightElbow", "rightHip"],
      },
      leftElbow: { x: 200, y: 200, radius: 6, connections: ["leftWrist"] },
      rightElbow: { x: 300, y: 200, radius: 6, connections: ["rightWrist"] },
      leftWrist: { x: 190, y: 250, radius: 6, connections: [] },
      rightWrist: { x: 310, y: 250, radius: 6, connections: [] },
      leftHip: {
        x: 230,
        y: 220,
        radius: 6,
        connections: ["rightHip", "leftKnee"],
      },
      rightHip: {
        x: 260,
        y: 220,
        radius: 6,
        connections: ["rightKnee", "leftHip"],
      },
      leftKnee: { x: 230, y: 280, radius: 6, connections: ["leftAnkle"] },
      rightKnee: { x: 270, y: 280, radius: 6, connections: ["rightAnkle"] },
      leftAnkle: { x: 220, y: 350, radius: 6, connections: [] },
      rightAnkle: { x: 280, y: 350, radius: 6, connections: [] },
    };

    // Clone the default joints for our working state
    this.joints = JSON.parse(JSON.stringify(this.defaultJoints));
    this.selectedJoint = null;
    this.isDragging = false;
    console.log(this.joints);

    // Bind event handlers
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    // Initial drawing
    this.draw();

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseUp);
  }

  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw connections (lines)
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 4;

    for (const jointName in this.joints) {
      const joint = this.joints[jointName];
      for (const connectedJointName of joint.connections) {
        const connectedJoint = this.joints[connectedJointName];
        this.ctx.beginPath();
        this.ctx.moveTo(joint.x, joint.y);
        this.ctx.lineTo(connectedJoint.x, connectedJoint.y);
        this.ctx.stroke();
      }
    }

    // Draw head (special case - larger circle)
    this.ctx.fillStyle = "#333";
    this.ctx.beginPath();
    this.ctx.arc(
      this.joints.head.x,
      this.joints.head.y,
      this.joints.head.radius,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // Draw joints (circles)
    for (const jointName in this.joints) {
      if (jointName === "head") continue; // Skip head as we've already drawn it

      const joint = this.joints[jointName];
      this.ctx.fillStyle =
        this.selectedJoint === jointName ? "#ff4500" : "#333";
      this.ctx.beginPath();
      this.ctx.arc(joint.x, joint.y, joint.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is over any joint
    for (const jointName in this.joints) {
      const joint = this.joints[jointName];
      const distance = Math.sqrt((joint.x - x) ** 2 + (joint.y - y) ** 2);

      if (distance <= joint.radius) {
        this.selectedJoint = jointName;
        this.isDragging = true;
        this.canvas.style.cursor = "grabbing";
        break;
      }
    }

    this.draw();
  }

  handleMouseMove(e) {
    if (!this.isDragging || !this.selectedJoint) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update the position of the selected joint
    this.joints[this.selectedJoint].x = Math.max(
      0,
      Math.min(this.canvas.width, x)
    );
    this.joints[this.selectedJoint].y = Math.max(
      0,
      Math.min(this.canvas.height, y)
    );

    this.draw();
  }

  handleMouseUp() {
    this.isDragging = false;
    this.selectedJoint = null;
    this.canvas.style.cursor = "default";
  }

  resetPose() {
    this.joints = JSON.parse(JSON.stringify(this.defaultJoints));
    this.draw();
  }

  generateRandomPose() {
    for (const jointName in this.joints) {
      if (jointName === "head") {
        // Keep head centered horizontally but allow some vertical variation
        this.joints[jointName].x = this.defaultJoints.head.x;
        this.joints[jointName].y =
          this.defaultJoints.head.y + (Math.random() * 40 - 20);
      } else if (jointName === "neck") {
        // Keep neck aligned with head
        this.joints[jointName].x = this.joints.head.x;
        this.joints[jointName].y = this.joints.head.y + 30;
      } else if (jointName === "leftHip") {
        // Keep hip aligned with neck
        this.joints[jointName].x = this.joints.neck.x - 20;
        this.joints[jointName].y = this.joints.neck.y + 90;
      } else if (jointName === "rightHip") {
        // Keep hip aligned with neck
        this.joints[jointName].x = this.joints.neck.x + 20;
        this.joints[jointName].y = this.joints.neck.y + 90;
      } else {
        // Random position with some constraints to keep poses realistic
        const baseJoint = this.defaultJoints[jointName];
        const range = jointName.includes("Ankle") ? 50 : 70;
        this.joints[jointName].x =
          baseJoint.x + (Math.random() * range - range / 2);
        this.joints[jointName].y =
          baseJoint.y + (Math.random() * range - range / 2);
      }
    }

    this.draw();
  }

  // Get current keypoints for comparison
  getKeypoints() {
    const keypoints = {};
    for (const jointName in this.joints) {
      keypoints[jointName] = {
        x: this.joints[jointName].x,
        y: this.joints[jointName].y,
      };
    }
    return keypoints;
  }

  // Set pose from keypoints (useful for loading poses)
  setPoseFromKeypoints(keypoints) {
    for (const jointName in keypoints) {
      if (this.joints[jointName]) {
        this.joints[jointName].x = keypoints[jointName].x;
        this.joints[jointName].y = keypoints[jointName].y;
      }
    }
    this.draw();
  }
}
