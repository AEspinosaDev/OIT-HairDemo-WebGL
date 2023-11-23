import { CONFIG } from "./config.js";
import { setVector3 } from "./program.js";

export function drawExampleScene(
  quadArray,
  opaqueBuffer,
  opaqueProgram,
  accumBuffer,
  accumProgram,
  compositeProgram,
  sceneUniformBuffer,
  cam,
  lightPosition,
  screenProgram,
  drag_angles
) {
  var gl = document.getElementById("gl-canvas").getContext("webgl2");

  const NUM_QUADS = 5;
  var QUAD_COLORS = [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ];
  const DELTA_Z = 2;

  /////////////////////////////////////////////////////////////////////////////////////////////
  //OPAQUE PASS
  ///////////////////////////////

  // CONFIGURE
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthFunc(gl.LESS);

  //CLEAR
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //DRAW
  gl.useProgram(opaqueProgram);
  for (let i = 0; i < NUM_QUADS; i++) {
    var modelView = mat4.create();
    var model = mat4.create();
    mat4.rotateX(model, model, drag_angles[0]);
    mat4.rotateY(model, model, 0);
    mat4.rotateZ(model, model, drag_angles[1]);
    mat4.translate(model, model, vec3.fromValues(2 * i, 2 * i, i * -DELTA_Z));
    mat4.scale(model, model, vec3.fromValues(10, 10, 10));
    mat4.multiply(modelView, cam.viewMatrix, model);

    setVector3(opaqueProgram, QUAD_COLORS[i], "uColor");
    gl.useProgram(opaqueProgram);
    //Update uniforms
    var sceneUniformData = new Float32Array(56);
    sceneUniformData.set(cam.projMatrix);
    sceneUniformData.set(cam.viewMatrix, 16);
    sceneUniformData.set(modelView, 32);
    sceneUniformData.set(cam.position, 48);
    sceneUniformData.set(lightPosition, 52);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, sceneUniformData);

    //draw(quadArray);
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  //TRANSPARENT PASS (BACK FACE)
  ///////////////////////////////

  if (CONFIG["back face"]) {
    // CONFIGURE
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);

    gl.enable(gl.CULL_FACE); //DRAW BACK FACE
    gl.cullFace(gl.FRONT);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);

    //CLEAR
    gl.bindFramebuffer(gl.FRAMEBUFFER, accumBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(accumProgram);
    for (let i = 0; i < NUM_QUADS; i++) {
      var modelView = mat4.create();
      var model = mat4.create();
      mat4.rotateX(model, model, drag_angles[0]);
      mat4.rotateY(model, model, 0);
      mat4.rotateZ(model, model, drag_angles[1]);
      mat4.translate(model, model, vec3.fromValues(2 * i, 2 * i, i * -DELTA_Z));

      mat4.scale(model, model, vec3.fromValues(10, 10, 10));
      mat4.multiply(modelView, cam.viewMatrix, model);

      setVector3(accumProgram, QUAD_COLORS[i], "uHairColor");
      gl.useProgram(accumProgram);

      //Update uniforms
      var sceneUniformData = new Float32Array(56);
      sceneUniformData.set(cam.projMatrix);
      sceneUniformData.set(cam.viewMatrix, 16);
      sceneUniformData.set(modelView, 32);
      sceneUniformData.set(cam.position, 48);
      sceneUniformData.set(lightPosition, 52);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, sceneUniformData);

      draw(quadArray);
    }

    gl.disable(gl.CULL_FACE);

    /////////////////////////////////////////////////////////////////////////////////////////////
    ///COMPOSITION PASS (BACK FACE)
    ///////////////////////////////

    // CONFIGURE
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(false);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);

    gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);
    gl.useProgram(compositeProgram);

    draw(quadArray);
  }

  /////////////////////////////////////////////////////////////////////////////////////////////
  //TRANSPARENT PASS (FRONT FACE)
  ///////////////////////////////

  if (CONFIG["front face"]) {
    // CONFIGURE
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);

    gl.enable(gl.CULL_FACE); //DRAW FRONT FACE
    gl.cullFace(gl.BACK);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);

    //CLEAR
    gl.bindFramebuffer(gl.FRAMEBUFFER, accumBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(accumProgram);
    for (let i = 0; i < NUM_QUADS; i++) {
      var modelView = mat4.create();
      var model = mat4.create();
      mat4.rotateX(model, model, drag_angles[0]);
      mat4.rotateY(model, model, 0);
      mat4.rotateZ(model, model, drag_angles[1]);
      mat4.translate(model, model, vec3.fromValues(2 * i, 2 * i, i * -DELTA_Z));
      mat4.scale(model, model, vec3.fromValues(10, 10, 10));
      mat4.multiply(modelView, cam.viewMatrix, model);

      setVector3(accumProgram, QUAD_COLORS[i], "uHairColor");
      gl.useProgram(accumProgram);

      //Update uniforms
      var sceneUniformData = new Float32Array(56);
      sceneUniformData.set(cam.projMatrix);
      sceneUniformData.set(cam.viewMatrix, 16);
      sceneUniformData.set(modelView, 32);
      sceneUniformData.set(cam.position, 48);
      sceneUniformData.set(lightPosition, 52);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, sceneUniformData);

      draw(quadArray);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////
    ///COMPOSITION PASS (FRONT FACE)
    ///////////////////////////////

    // CONFIGURE
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(false);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);

    //CLEAR
    gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);
    gl.useProgram(compositeProgram);
    draw(quadArray);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, accumBuffer);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  ////////////////////////////////////////////////////////////////////////////////////////////
  // RTT
  ///////////////////////////////

  // CONFIGURE
  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(gl.TRUE);
  gl.disable(gl.BLEND);
  // gl.enable(gl.FRAMEBUFFER_SRGB);

  // Bind BackBuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.useProgram(screenProgram);
  draw(quadArray);
}

function draw(quadArray) {
  var gl = document.getElementById("gl-canvas").getContext("webgl2");
  gl.bindVertexArray(quadArray);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
