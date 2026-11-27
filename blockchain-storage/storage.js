// Encryption, IPFS and blockchain
const fn = (name, mutability, inputs, outputs = []) => ({ type: "function", name,
  stateMutability: mutability, inputs, outputs });
const p = (name, type) => ({ name, type });
const ABI = [
  fn("addFile", "nonpayable", [p("id", "bytes32"), p("hashes", "bytes32[4]"), p("cids", "string[4]")]),
  fn("getFile", "view", [p("id", "bytes32")],
     [p("owner", "address"), p("time", "uint256"), p("hashes", "bytes32[4]"), p("cids", "string[4]")])
];
const MAX_SIZE = 20 * 1024 * 1024;
const text = s => new TextEncoder().encode(s);

// The encryption key is derived from the user's hash key and is never stored
async function aesKey(hashKey) {
  const raw = await crypto.subtle.digest("SHA-256", text("encrypt:" + hashKey));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const out = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return new Blob([iv, out]);
}

async function decrypt(key, data) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12));
}

async function ipfsUpload(blob, jwt, name) {
  const form = new FormData();
  form.append("network", "public");
  form.append("file", blob, name);
  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST", headers: { Authorization: "Bearer " + jwt }, body: form
  });
  if (!res.ok) throw new Error("IPFS upload failed (" + res.status + "). Check your Pinata JWT.");
  return (await res.json()).data.cid;
}

// TronLink on the Shasta test network
async function contract() {
  if (!window.tronLink) throw new Error("TronLink not found.");
  const reply = await tronLink.request({ method: "tron_requestAccounts" });
  const web = window.tronWeb;
  if (!web?.defaultAddress?.base58 || (reply?.code && reply.code !== 200)) {
    throw new Error("Unlock TronLink, approve the request and try again.");
  }
  if (!web.fullNode.host.includes("shasta")) throw new Error("Switch TronLink to the Shasta network.");
  if (!web.isAddress(CONFIG.contractAddress)) {
    throw new Error("Set the contract address in chain-config.js.");
  }
  const c = await web.contract(ABI, CONFIG.contractAddress);

  return {
    async add(id, hashes, cids, progress) {
      progress("Confirm the transaction in TronLink...");
      const txHash = await c.addFile(id, hashes, cids).send({ feeLimit: 300000000 });
      progress("Waiting for the blockchain...");
      for (let i = 0; i < 40; i++) {
        await new Promise(done => setTimeout(done, 3000));
        const info = await web.trx.getUnconfirmedTransactionInfo(txHash);
        if (info?.receipt) {
          if (info.receipt.result !== "SUCCESS") {
            throw new Error("Transaction failed: " + info.receipt.result + ". Check your test TRX.");
          }
          return txHash;
        }
      }
      throw new Error("Not confirmed yet. Check this transaction on Shasta Tronscan: " + txHash);
    },
    get: id => c.getFile(id).call()
  };
}

async function storeFile(file, hashKey, jwt, progress) {
  if (file.size > MAX_SIZE) throw new Error("Choose a file up to 20 MB.");
  const c = await contract();
  const key = await aesKey(hashKey);
  const blocks = await splitFile(file);
  const id = [...crypto.getRandomValues(new Uint8Array(32))]
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const parts = [];
  for (let i = 0; i < blocks.length; i++) {
    progress("Encrypting and uploading block " + (i + 1) + " of 4...");
    const sealed = await encrypt(key, blocks[i].data);
    const hash = await sha256(await sealed.arrayBuffer());
    const cid = await ipfsUpload(sealed, jwt, id + "-" + (i + 1));
    parts.push({ bytes: blocks[i].data.byteLength, hash, cid });
  }
  const txHash = await c.add("0x" + id, parts.map(p => "0x" + p.hash), parts.map(p => p.cid), progress);
  return { id, parts, txHash };
}

async function fetchFile(id, hashKey, progress) {
  const c = await contract();
  const { hashes, cids } = await c.get("0x" + id);
  const key = await aesKey(hashKey);
  const out = [];
  for (let i = 0; i < 4; i++) {
    progress("Downloading block " + (i + 1) + " of 4...");
    const res = await fetch(CONFIG.gateway + cids[i]);
    if (!res.ok) throw new Error("Could not download block " + (i + 1) + " (" + res.status + ").");
    const data = await res.arrayBuffer();
    if ("0x" + await sha256(data) !== hashes[i]) throw new Error("Block " + (i + 1) + " was changed");
    out.push(await decrypt(key, data));
  }
  return new Blob(out);
}
