import {
  createProgram,
  setFLoat,
  setInt,
  setVector3,
} from "./modules/program.js";
import {
  createVertexBuffer,
  createVertexBufferFree,
} from "./modules/geometry.js";
import { Camera } from "./modules/camera.js";
import { CONFIG } from "./modules/config.js";
import { drawExampleScene } from "./modules/exampleScene.js";

var keys = {};
let then = 0;
var mouse_pressed = false;
var drag_angles = [0, 0];
var mouseLast = [0, 0];
var scale = 1;
var canvas = document.getElementById("gl-canvas");
var renderHair = true;
var useInput = true;

function initApp(meshes) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  meshes.hair.calculateTangentsAndBitangents();

  var gl = canvas.getContext("webgl2", { antialias: false });

  if (!gl) {
    console.error("WebGL 2 not available");
    document.body.innerHTML =
      "This example requires WebGL 2 which is unavailable on this system.";
  }

  gl.enable(gl.BLEND);
  gl.depthMask(false);

  if (!gl.getExtension("EXT_color_buffer_float")) {
    console.error("FLOAT color buffer not available");
    document.body.innerHTML =
      "This example requires EXT_color_buffer_float which is unavailable on this system.";
  }

  // ACCUMULATION PROGRAM
  var accumProgram = createProgram("vertex-accum", "fragment-accum");
  // OPAQUE PROGRAM
  var opaqueProgram = createProgram("head_vert", "head_frag");
  // COMPOSITE PROGRAM
  var compositeProgram = createProgram("vertex-quad", "fragment-draw");
  // SCREEN PROGRAM
  var screenProgram = createProgram("vertex-quad", "screen-draw");

  ////////////////////////////////
  ////GUI SETUP
  //////////////////////////////////

  //#region gui
  const gui = new dat.GUI();
  const folder = gui.addFolder("Configuration");
  folder.add(CONFIG, "draw head");
  folder.add(CONFIG, "draw hair");
  folder.add(CONFIG, "front face");
  folder.add(CONFIG, "back face");
  folder.addColor(CONFIG, "hair color").onChange(function () {
    setVector3(
      accumProgram,
      [
        CONFIG["hair color"][0] / 255.0,
        CONFIG["hair color"][1] / 255.0,
        CONFIG["hair color"][2] / 255.0,
      ],
      "uHairColor"
    );
  });
  
  folder.addColor(CONFIG, "skin color").onChange(function () {
    setVector3(
      opaqueProgram,
      [
        CONFIG["skin color"][0] / 255.0,
        CONFIG["skin color"][1] / 255.0,
        CONFIG["skin color"][2] / 255.0,
      ],
      "uColor"
    );
  });
  folder.add(CONFIG, "light position x", -20, 20, 1);
  folder.add(CONFIG, "light position y", -20, 20, 1);
  folder.add(CONFIG, "light position z", -20, 20, 1);
  const t_folder = folder.addFolder("Transparency")
  t_folder.open()
  t_folder.add(CONFIG, "hair opacity", 0, 1, 0.05).onChange(function () {
    setFLoat(accumProgram, CONFIG["hair opacity"], "uHairOpacity");
  });
  t_folder.add(CONFIG, "weighted").onChange(function () {
    setInt(accumProgram, CONFIG["weighted"], "uWeighted");
  });
  t_folder.add(CONFIG, "weight func",CONFIG["weight func"]).onChange(function(value){
    setInt(accumProgram,value,"uWeightFunc")
  });
  const extra_folder = folder.addFolder("Extra")
  extra_folder.open()
  extra_folder.add(CONFIG, "simple scene").onChange(function () {
    setVector3(
      accumProgram,
      [
        CONFIG["hair color"][0] / 255.0,
        CONFIG["hair color"][1] / 255.0,
        CONFIG["hair color"][2] / 255.0,
      ],
      "uHairColor"
    );
    setVector3(
      opaqueProgram,
      [
        CONFIG["skin color"][0] / 255.0,
        CONFIG["skin color"][1] / 255.0,
        CONFIG["skin color"][2] / 255.0,
      ],
      "uColor"
    );
    setInt(accumProgram, CONFIG["simple scene"], "uSimpleScene");
  });
  folder.open();
  //#endregion

  ////////////////////////////////
  //  SET UP FRAMEBUFFERS
  ////////////////////////////////

  //#region framebuffers

  var opaqueBuffer = gl.createFramebuffer();

  gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);

  var op_colorTarget = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, op_colorTarget);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage2D(
    gl.TEXTURE_2D,
    1,
    gl.RGBA16F,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  );
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    op_colorTarget,
    0
  );

  var depthTarget = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTarget);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage2D(
    gl.TEXTURE_2D,
    1,
    gl.DEPTH_COMPONENT16,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  );
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.TEXTURE_2D,
    depthTarget,
    0
  );

  var accumBuffer = gl.createFramebuffer();

  gl.bindFramebuffer(gl.FRAMEBUFFER, accumBuffer);
  gl.activeTexture(gl.TEXTURE0);

  var accumTarget = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, accumTarget);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage2D(
    gl.TEXTURE_2D,
    1,
    gl.RGBA16F,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  );
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    accumTarget,
    0
  );

  var accumAlphaTarget = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, accumAlphaTarget);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage2D(
    gl.TEXTURE_2D,
    1,
    gl.R16F,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  );
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT1,
    gl.TEXTURE_2D,
    accumAlphaTarget,
    0
  );

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.TEXTURE_2D,
    depthTarget,
    0
  );

  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  //#endregion

  /////////////////////
  // SET UP GEOMETRY
  /////////////////////

  //HAIR
  var hairArray = createVertexBuffer(meshes.hair);
  //HEAD
  var headArray = createVertexBuffer(meshes.head);
  //QUAD FOR RTT AND SIMPLE SCENE
  var quadArray = createVertexBufferFree(
    [-1, 1, 0, -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    null,
    null,
    null,
    true
  );

  console.log(meshes.hair);
  //////////////////////
  // SET UP UNIFORMS
  //////////////////////

  var eyePosition = vec3.fromValues(0, 0, 20);

  var cam = new Camera(
    canvas,
    eyePosition,
    vec3.fromValues(eyePosition[0], eyePosition[1], eyePosition[2] - 1),
    vec3.fromValues(0, 1, 0),
    false,
    Math.PI / 2,
    100,
    0.1
  );

  var modelView = mat4.create();
  var model = mat4.create();
  mat4.multiply(modelView, model, cam.viewMatrix);

  var image = new Image();

  var sceneUniformData = new Float32Array(56);
  var sceneUniformBuffer = gl.createBuffer();
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
  gl.bufferData(gl.UNIFORM_BUFFER, sceneUniformData, gl.STATIC_DRAW);

  image.src = "resources/T_StandardWSet_Alpha.png";

  image.onload = function () {
    ///////////////////////
    // BIND TEXTURES
    ///////////////////////

    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    var levels = (levels =
      Math.floor(Math.log2(Math.max(this.width, this.height))) + 1);
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, image.width, image.height);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      image.width,
      image.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, accumTarget);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, accumAlphaTarget);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, op_colorTarget);
    gl.useProgram(screenProgram);

    setInt(screenProgram, 3, "screen");
    setInt(accumProgram, 0, "uTexture");
    setVector3(
      accumProgram,
      [
        CONFIG["hair color"][0] / 255.0,
        CONFIG["hair color"][1] / 255.0,
        CONFIG["hair color"][2] / 255.0,
      ],
      "uHairColor"
    );
    setVector3(
      opaqueProgram,
      [
        CONFIG["skin color"][0] / 255.0,
        CONFIG["skin color"][1] / 255.0,
        CONFIG["skin color"][2] / 255.0,
      ],
      "uColor"
    );
    setFLoat(accumProgram, CONFIG["hair opacity"], "uHairOpacity");
    setInt(accumProgram,2,"uWeightFunc");
    setInt(accumProgram,1,"uWeighted");


    setInt(compositeProgram, 1, "uAccumulate");
    setInt(compositeProgram, 2, "uAccumulateAlpha");

    requestAnimationFrame(draw);
  };

  function draw(now) {
    now *= 0.001; // seconds;
    const deltaTime = now - then;
    then = now;
    cam.Update(keys, deltaTime);

    //Update model matrix
    var modelView = mat4.create();
    var model = mat4.create();
    mat4.rotateX(model, model, -45);
    mat4.rotateX(model, model, drag_angles[0]);
    mat4.rotateY(model, model, 0);
    mat4.rotateZ(model, model, drag_angles[1]);
    mat4.scale(model, model, vec3.fromValues(scale, scale, scale));
    mat4.multiply(modelView, cam.viewMatrix, model);

    //Update uniforms
    var sceneUniformData = new Float32Array(56);
    sceneUniformData.set(cam.projMatrix);
    sceneUniformData.set(cam.viewMatrix, 16);
    sceneUniformData.set(modelView, 32);
    sceneUniformData.set(cam.position, 48);
    sceneUniformData.set(
      [
        CONFIG["light position x"],
        CONFIG["light position y"],
        CONFIG["light position z"],
      ],
      52
    );
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneUniformBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, sceneUniformData);

    /////////////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////////////
    //  █▀▄ █▀█ ▄▀█ █░█░█      █▀▀ █▀█ █▀█ █▀▀
    //  █▄▀ █▀▄ █▀█ ▀▄▀▄▀      █▄▄ █▄█ █▀▄ ██▄
    /////////////////////////////////////////////////////////////////////////////////////////////

    if (!CONFIG["simple scene"]) {
      /////////////////////////////////////////////////////////////////////////////////////////////
      //OPAQUE PASS
      ///////////////////////////////

      // CONFIGURE
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LESS);
      // gl.depthFunc(gl.LEQUAL);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      //DRAW
      if (CONFIG["draw head"]) {
        gl.useProgram(opaqueProgram);
        gl.bindVertexArray(headArray);
        gl.drawElements(
          gl.TRIANGLES,
          meshes.head.indices.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }
      /////////////////////////////////////////////////////////////////////////////////////////////
      //TRANSPARENT PASS (BACK FACE)
      ///////////////////////////////

      if (CONFIG["draw hair"]) {
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
          gl.bindVertexArray(hairArray);
          gl.drawElements(
            gl.TRIANGLES,
            meshes.hair.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );
          gl.disable(gl.CULL_FACE);

          /////////////////////////////////////////////////////////////////////////////////////////////
          ///COMPOSITION PASS (BACK FACE)
          ///////////////////////////////

          // CONFIGURE
          gl.depthFunc(gl.ALWAYS);
          gl.depthMask(false);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);
          // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

          gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);
          gl.useProgram(compositeProgram);
          gl.bindVertexArray(quadArray);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
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
          gl.bindVertexArray(hairArray);
          gl.drawElements(
            gl.TRIANGLES,
            meshes.hair.indices.length,
            gl.UNSIGNED_SHORT,
            0
          );

          /////////////////////////////////////////////////////////////////////////////////////////////
          ///COMPOSITION PASS (FRONT FACE)
          ///////////////////////////////

          // CONFIGURE
          gl.depthFunc(gl.ALWAYS);
          gl.depthMask(false);

          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA);
          //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

          //CLEAR
          gl.bindFramebuffer(gl.FRAMEBUFFER, opaqueBuffer);
          gl.useProgram(compositeProgram);
          gl.bindVertexArray(quadArray);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        } else {
          gl.bindFramebuffer(gl.FRAMEBUFFER, accumBuffer);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
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
      gl.bindVertexArray(quadArray);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // gl.disable(gl.FRAMEBUFFER_SRGB);
    } else {
      drawExampleScene(
        quadArray,
        opaqueBuffer,
        opaqueProgram,
        accumBuffer,
        accumProgram,
        compositeProgram,
        sceneUniformBuffer,
        cam,
        [
          CONFIG["light position x"],
          CONFIG["light position y"],
          CONFIG["light position z"],
        ],
        screenProgram,
        drag_angles
      );
    }

    requestAnimationFrame(draw);
  }
}

//#region callbacks

window.onload = function () {
  OBJ.downloadMeshes(
    {
      hair: "./resources/hair__.obj",
      head: "./resources/head_testing.obj", // located in the models folder on the server
    },
    initApp
  );
};
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (keys["p"] || keys["P"]) {
    renderHair = renderHair ? false : true;
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});
window.addEventListener("mousemove", (e) => {
  var x = e.clientX;
  var y = e.clientY;

  if (mouse_pressed) {
    var speed = 10 / canvas.clientHeight;
    drag_angles[0] += speed * (y - mouseLast[1]);
    drag_angles[1] += speed * (x - mouseLast[0]);
  }

  mouseLast[0] = x;
  mouseLast[1] = y;
});
window.addEventListener("mouseup", (e) => {
  mouse_pressed = false;
});
window.addEventListener("mousedown", (e) => {
  mouse_pressed = true;
});
window.addEventListener("mousewheel", (e) => {
  scale += e.deltaY * -0.0005;
});

//#endregion
