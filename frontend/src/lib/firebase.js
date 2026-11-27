import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Preserved exact Firebase configuration from firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyC6PGd4skGyvZZPTpTX6lnFjI0ZkbPbgwU",
  authDomain: "blokchane.firebaseapp.com",
  projectId: "blokchane",
  appId: "1:582707929687:web:d8bb0d92b4017be6bb7912"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;

