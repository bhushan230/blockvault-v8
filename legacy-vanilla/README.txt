VERSION 8: Blockchain Based Storage System
File > 4 blocks > AES-256 encryption > IPFS (Pinata) > hashes and CIDs on
TRON Shasta test network (smart contract). Users, roles and records are in Firebase.

A. FIREBASE
1. console.firebase.google.com > create project.
2. Authentication > enable Email/Password. Authorized domains: localhost.
3. Create Firestore Database. Rules: paste firestore.rules and Publish.
4. Project settings > add Web app > copy values into firebase-config.js.

B. TRONLINK
1. Install TronLink. Use a new test wallet with no real money.
2. Switch the network to Shasta Testnet. Copy your address (starts with T).
3. Get free test TRX: https://shasta.tronex.io/join/getJoinPage

C. SMART CONTRACT
1. Open https://www.tronide.io, create BlockStorage.sol, paste the file contents.
2. Solidity Compiler: choose a 0.8.x version (0.8.20 or newer) > Compile.
3. Deployment: connect TronLink (Shasta), choose BlockStorage > Deploy > sign.
4. Copy the contract address (starts with T) into chain-config.js.

D. PINATA (IPFS)
1. Create an account at pinata.cloud.
2. Create an API key allowed to upload files. Copy the JWT.
3. Copy your gateway domain into chain-config.js (keep /ipfs/ at the end).
4. Never put the JWT in a file or share it. Paste it on the page when uploading.

E. RUN
  python -m http.server 8000
  open http://localhost:8000/register.html

USE
Register > verify email > copy hash key > login > enter hash key and JWT >
choose a file (max 20 MB, test files only) > confirm in TronLink.
Download from "My files" using the same hash key.

FIRST ADMIN: in Firestore, change your users record role to "admin".

LIMITS (mention these in your report)
- A lost hash key means the files cannot be decrypted.
- Encrypted blocks and the record on the blockchain are public.
- Storage uses TronLink on Shasta. MetaMask only connects.
- Blocking and roles are enforced by the website and Firebase, not the contract.
- Files from older versions have no stored content.
