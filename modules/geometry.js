export function createVertexBuffer(mesh){

    var gl = document.getElementById("gl-canvas").getContext("webgl2");

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
  
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.vertices),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
  
    var uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.textures),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
  
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.vertexNormals),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    var tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(mesh.tangents),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(3);
  
    var indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(mesh.indices),
      gl.STATIC_DRAW
    );
  
    return vao;

}

export function createVertexBufferFree(positions,normals,tangents,uv,idx,mode3D = true){

    var gl = document.getElementById("gl-canvas").getContext("webgl2");

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
  
    if(positions){
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, mode3D? 3:2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    }

    if(uv){
    var uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(uv),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    }

    if(normals){
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(normals),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(2, mode3D? 3:2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);
    }
    if(tangents){
      var tangentBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(tangents),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(3, mode3D? 3:2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(3);
    }
  
    if(idx){
    var indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(idx),
      gl.STATIC_DRAW
    );
    }
  
    return vao;

}