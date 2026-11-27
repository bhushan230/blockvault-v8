const BLOCKS = 4; // every file is divided into 4 parts

async function sha256(data) {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function splitFile(file) {
  if (file.size < BLOCKS) throw new Error("File is too small to make 4 blocks.");
  const blocks = [];
  for (let i = 0; i < BLOCKS; i++) {
    const start = Math.floor(i * file.size / BLOCKS);
    const end = Math.floor((i + 1) * file.size / BLOCKS);
    const data = await file.slice(start, end).arrayBuffer();
    blocks.push({ data, hash: await sha256(data) });
  }
  return blocks;
}

async function joinBlocks(blocks) {
  for (let i = 0; i < blocks.length; i++) {
    if (await sha256(blocks[i].data) !== blocks[i].hash) {
      throw new Error("Block " + (i + 1) + " was changed");
    }
  }
  return new Blob(blocks.map(b => b.data));
}
