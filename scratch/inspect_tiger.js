const fs = require('fs');
const path = require('path');

async function inspectGLB() {
  const glbPath = path.join(process.cwd(), 'public', 'models', 'Tiger.glb');
  if (!fs.existsSync(glbPath)) {
    console.error('Tiger.glb not found at ' + glbPath);
    return;
  }
  console.log('Tiger.glb size:', fs.statSync(glbPath).size);

  // We can load dynamic three inside node if we want, or just parse GLTF JSON.
  // A GLB file has a 12-byte header, then chunks.
  // Header: magic (4 bytes), version (4 bytes), length (4 bytes)
  // Chunk 0: length (4 bytes), type (4 bytes: JSON), data
  const buffer = fs.readFileSync(glbPath);
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546C67) {
    console.error('Not a valid GLB file');
    return;
  }
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  console.log(`GLB Magic: glTF, Version: ${version}, Length: ${length}`);

  const chunkLength = buffer.readUInt32LE(12);
  const chunkType = buffer.readUInt32LE(16);
  if (chunkType !== 0x4E4F534A) {
    console.error('First chunk is not JSON');
    return;
  }

  const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
  const gltf = JSON.parse(jsonStr);

  console.log('\n--- NODES ---');
  if (gltf.nodes) {
    console.log(`Total nodes: ${gltf.nodes.length}`);
    gltf.nodes.forEach((node, i) => {
      if (node.name) {
        console.log(`Node ${i}: "${node.name}"`, node.mesh !== undefined ? `(Mesh: ${node.mesh})` : '', node.children ? `(Children: ${node.children.join(', ')})` : '');
      }
    });
  }

  console.log('\n--- MESHES ---');
  if (gltf.meshes) {
    console.log(`Total meshes: ${gltf.meshes.length}`);
    gltf.meshes.forEach((mesh, i) => {
      console.log(`Mesh ${i}: "${mesh.name}"`, mesh.primitives ? `(Primitives: ${mesh.primitives.length})` : '');
      if (mesh.primitives && mesh.primitives[0] && mesh.primitives[0].targets) {
        console.log(`  Morph Targets found! Count: ${mesh.primitives[0].targets.length}`);
      }
    });
  }

  console.log('\n--- SKINS ---');
  if (gltf.skins) {
    console.log(`Total skins: ${gltf.skins.length}`);
  }

  console.log('\n--- ANIMATIONS ---');
  if (gltf.animations) {
    console.log(`Total animations: ${gltf.animations.length}`);
    gltf.animations.forEach((anim, i) => {
      console.log(`Anim ${i}: "${anim.name || 'unnamed'}"`);
    });
  }
}

inspectGLB().catch(console.error);
