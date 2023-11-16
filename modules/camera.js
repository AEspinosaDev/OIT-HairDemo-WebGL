export class Camera {
    constructor(canvas, pos, fwd, up, isOrtho, fov, far, near) {
      this.position = pos;
      this.initialPosition = pos;
      this.forward = fwd;
      this.up = up;
  
      this.isOrtho = isOrtho;
  
      this.fov = fov;
      this.far = far;
      this.near = near;
  
      this.viewMatrix = new Float32Array(16);
      this.projMatrix = new Float32Array(16);
  
      this.turnSpeed = 90;
      this.speed = 1;
      this.ang = 0;
      this.roll = 0;
      this.elev = 0;
  
      mat4.lookAt(this.viewMatrix, this.position, this.forward, this.up);
      this.Refresh(canvas);
    }
    Refresh(canvas) {
      if (!this.isOrtho) {
        mat4.perspective(
          this.projMatrix,
          Math.PI / 2,
          canvas.clientWidth / canvas.clientHeight,
          this.near,
          this.far
        );
      } else {
        mat4.ortho(
          this.projMatrix,
          0,
          canvas.clientWidth,
          0,
          canvas.clientHeight,
          this.near,
          this.far
        );
      }
    }
  
    Update(keys, deltaTime) {
      if (keys["W"] || keys["S"] || keys["w"] || keys["s"]) {
        const direction = keys["W"] || keys["w"] ? -1 : 1;
        // w
        this.position[0] += this.forward[0] * deltaTime * this.speed * direction;
        this.position[1] += this.forward[1] * deltaTime * this.speed * direction;
        this.position[2] += this.forward[2] * deltaTime * this.speed * direction;
      }
  
      if (keys["A"] || keys["D"] || keys["a"] || keys["d"]) {
        const direction = keys["A"] || keys["a"] ? -1 : 1;
  
        var forward = vec3.fromValues(
          this.forward[0],
          this.forward[1],
          this.forward[2]
        );
        var up = vec3.fromValues(this.up[0], this.up[1], this.up[2]);
        var side = vec3.create();
        vec3.cross(side, up, forward);
  
        this.position[0] += side[0] * deltaTime * this.speed * direction;
        this.position[1] += side[1] * deltaTime * this.speed * direction;
        this.position[2] += side[2] * deltaTime * this.speed * direction;
      }
  
      if (keys["Q"] || keys["E"] || keys["q"] || keys["e"]) {
        const direction = keys["Q"] || keys["q"] ? -10 : 10;
  
        this.position[0] += this.up[0] * deltaTime * this.speed * direction;
        this.position[1] += this.up[1] * deltaTime * this.speed * direction;
        this.position[2] += this.up[2] * deltaTime * this.speed * direction;
      }
  
      if (keys["R"] || keys["r"]) {
        this.position[0] = this.initialPosition[0];
        this.position[1] = this.initialPosition[1];
        this.position[2] = this.initialPosition[2];
  
        this.forward[0] = 0;
        this.forward[1] = 0;
        this.forward[2] = 1;
      }
  
      // mat4.lookAt(this.viewMatrix, this.position, vec3.fromValues(this.position[0] - this.forward[0], this.position[1] - this.forward[1], this.position[2] - this.forward[2]), this.up);
      mat4.lookAt(
        this.viewMatrix,
        this.position,
        vec3.fromValues(
          this.position[0] - this.forward[0],
          this.position[1] - this.forward[1],
          this.position[2] - this.forward[2]
        ),
        this.up
      );
    }
  }