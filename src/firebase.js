// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeYMohSww9zsWBUFZbcyN0BhykN4i24Qo",
  authDomain: "route-aad50.firebaseapp.com",
  projectId: "route-aad50",
  storageBucket: "route-aad50.appspot.com",
  messagingSenderId: "748774586096",
  appId: "1:748774586096:web:44a41d15b47aeeab717435",
  measurementId: "G-ZTV9W9H5E6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore and export
const db = getFirestore(app);
export { db };
