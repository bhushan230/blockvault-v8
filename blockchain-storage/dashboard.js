const el = id => document.getElementById(id);
let me, uid;
const users = () => firebase.firestore().collection("users");

firebase.auth().onAuthStateChanged(async user => {
  if (!user || !user.emailVerified) { location.replace("login.html"); return; }
  uid = user.uid;
  try {
    me = (await users().doc(uid).get()).data();
    if (!me) throw new Error("Account details not found.");
    if (me.blocked) throw new Error("Your account is blocked.");
    el("user").textContent = "Logged in: " + me.email + " (" + me.role + ")";
    el("app").hidden = false;
    await showMine();
    if (me.role === "admin" || me.role === "moderator") {
      el("staff").hidden = false;
      await showUsers();
    }
    if (me.role === "admin") {
      el("adminfiles").hidden = false;
      await showFiles();
    }
  } catch (err) {
    el("user").textContent = err.message;
  }
});

el("logout").onclick = () => firebase.auth().signOut();

async function change(id, data) {
  try {
    await users().doc(id).update(data);
    await showUsers();
    el("staffmsg").textContent = "Saved.";
  } catch (err) {
    el("staffmsg").textContent = err.message;
  }
}

function button(text, action) {
  const b = document.createElement("button");
  b.textContent = text;
  b.onclick = action;
  return b;
}

async function showUsers() {
  const result = await users().get();
  el("users").textContent = "";
  result.forEach(doc => {
    const u = doc.data();
    const li = document.createElement("li");
    li.textContent = u.name + " | " + u.email + " | " + u.role + (u.blocked ? " | BLOCKED " : " ") +
      (u.metamask ? "| MetaMask: " + u.metamask + " " : "") +
      (u.tronlink ? "| TronLink: " + u.tronlink + " " : "") +
      (u.adminRequest && u.role !== "admin" ? "| ASKS FOR ADMIN " : "");
    const mayBlock = doc.id !== uid && (me.role === "admin" || u.role === "user");
    if (mayBlock) li.append(button(u.blocked ? "Unblock" : "Block", () => change(doc.id, { blocked: !u.blocked })));
    if (me.role === "admin" && doc.id !== uid) {
      for (const role of ["user", "moderator", "admin"]) {
        if (role !== u.role) li.append(button("Make " + role, () => change(doc.id, { role })));
      }
    }
    el("users").append(li);
  });
}

async function saveWallet(field, label, address) {
  await users().doc(uid).update({ [field]: address });
  el("wallet").textContent = label + " connected: " + address;
}

el("metamask").onclick = async () => {
  try {
    if (!window.ethereum) throw new Error("MetaMask not found.");
    const [address] = await ethereum.request({ method: "eth_requestAccounts" });
    await saveWallet("metamask", "MetaMask", address);
  } catch (err) {
    el("wallet").textContent = err.message;
  }
};

el("tronlink").onclick = async () => {
  try {
    if (!window.tronLink) throw new Error("TronLink not found.");
    const reply = await tronLink.request({ method: "tron_requestAccounts" });
    const address = window.tronWeb?.defaultAddress?.base58;
    if (!address || (reply?.code && reply.code !== 200)) {
      throw new Error("Unlock TronLink, approve the request and try again.");
    }
    await saveWallet("tronlink", "TronLink", address);
  } catch (err) {
    el("wallet").textContent = err.message;
  }
};

// Confirms the typed hash key belongs to the logged-in account
async function myKey() {
  const key = el("hashkey").value.trim().toLowerCase();
  if (!key) throw new Error("Enter your hash key first.");
  const found = await firebase.firestore().collection("keys").doc(await sha256(text(key))).get();
  if (!found.exists || found.data().uid !== uid) throw new Error("That is not your hash key.");
  return key;
}

const progress = m => el("msg").textContent = m;

el("file").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.disabled = true;
  try {
    const key = await myKey();
    const jwt = el("jwt").value.trim();
    if (!jwt) throw new Error("Enter your Pinata JWT.");
    const { id, parts, txHash } = await storeFile(file, key, jwt, progress);
    progress("On the blockchain (tx " + txHash + "). Saving to your list...");
    await users().doc(uid).collection("myfiles").doc(id)
      .set({ fileName: file.name, size: file.size, txHash });
    await firebase.firestore().collection("files").doc(id)
      .set({ uid, email: me.email, fileName: file.name, size: file.size, parts, txHash });
    progress("Stored. Transaction: " + txHash);
    await showMine();
    if (me.role === "admin") await showFiles();
  } catch (err) {
    progress(err.shortMessage || err.message);
  } finally {
    e.target.disabled = false;
    e.target.value = "";
  }
};

async function showMine() {
  const result = await users().doc(uid).collection("myfiles").get();
  el("mine").textContent = result.docs.length ? "" : "No files yet.";
  result.forEach(doc => {
    const f = doc.data();
    const li = document.createElement("li");
    li.textContent = f.fileName + " (" + f.size + " bytes) ";
    li.append(button("Download", async () => {
      try {
        const blob = await fetchFile(doc.id, await myKey(), progress);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = f.fileName;
        a.click();
        progress("All 4 blocks verified. File downloaded.");
      } catch (err) {
        progress(err.name === "OperationError" ? "Wrong key for this file." : err.shortMessage || err.message);
      }
    }));
    el("mine").append(li);
  });
}

async function showFiles() {
  const result = await firebase.firestore().collection("files").get();
  el("records").textContent = result.docs.length ? "" : "No records yet.";
  result.forEach(doc => {
    const f = doc.data();
    const title = document.createElement("p");
    title.textContent = f.email + " | " + f.fileName + " | " + f.size + " bytes | " + f.parts.length + " block(s)" + (f.txHash ? " | tx " + f.txHash : "");
    const grid = document.createElement("div");
    grid.className = "grid";
    let start = 0;
    f.parts.forEach((p, i) => {
      const card = document.createElement("div");
      card.className = "block";
      for (const text of [
        "Block " + (i + 1),
        (p.bytes / f.size * 100).toFixed(2) + "% of document",
        p.bytes + " bytes (" + (p.bytes / 1024).toFixed(2) + " KB)",
        "Bytes " + (start + 1) + " to " + (start + p.bytes),
        "SHA-256: " + p.hash,
        "IPFS CID: " + (p.cid || "not stored"),
      ]) {
        const line = document.createElement("div");
        line.textContent = text;
        card.append(line);
      }
      start += p.bytes;
      grid.append(card);
    });
    el("records").append(title, grid);
  });
}

el("refresh").onclick = () => showFiles().catch(err => el("msg").textContent = err.message);
