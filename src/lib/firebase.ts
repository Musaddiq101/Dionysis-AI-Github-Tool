// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getDownloadURL, getStorage, ref, uploadBytesResumable} from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "dionysis-52633.firebaseapp.com",
  projectId: "dionysis-52633",
  storageBucket: "dionysis-52633.firebasestorage.app",
  messagingSenderId: "1088209304203",
  appId: "1:1088209304203:web:69ecf17ff985c241aa328e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export async function uploadFile(file: File, setProgress: (progress: number) => void) {
  return new Promise((resolve, reject) => {
    try {
        const storageRef = ref(storage, file.name);
        const uploadTask = uploadBytesResumable(storageRef, file);
        uploadTask.on('state_changed',snapShot => {
            const progress = Math.round((snapShot.bytesTransferred / snapShot.totalBytes) * 100); //gives the progress on file byte uploaded
            if (setProgress) setProgress(progress);
            switch (snapShot.state) {
                case 'paused':
                    console.log('Upload is paused');
                    break;
                case 'running':
                    console.log('Upload is running');
                    break;
            }
        }, error => {
            reject(error);
        }, () => {
            //after the file is successfully uploaded - we get the mp3 url which we can use to access it later
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                resolve(downloadURL as string);
            })
        })
    } catch (error) {
        console.error(error);
        reject(error);
    }
  })
}