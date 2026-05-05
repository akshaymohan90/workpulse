import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1W-nxtBKCmoyAVNen0XdwoWBpKfBDoZU",
  authDomain: "work-pulse-48710.firebaseapp.com",
  projectId: "work-pulse-48710",
  storageBucket: "work-pulse-48710.firebasestorage.app",
  messagingSenderId: "954881082241",
  appId: "1:954881082241:web:fb5c91c376f841dfabde80",
  measurementId: "G-8XPJRP19ZS"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
