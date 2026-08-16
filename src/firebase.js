// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCdSyggAlKW-q_pDMwFvLKV1mKYmANA7U",
  authDomain: "apexpos-ef6a0.firebaseapp.com",
  projectId: "apexpos-ef6a0",
  storageBucket: "apexpos-ef6a0.appspot.com",
  messagingSenderId: "123316014625",
  appId: "1:123316014625:web:edd04e73ba2d1d524f5d60"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);