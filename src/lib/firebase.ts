import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyApZcKZtqIkR1lMF4Ynavf0AJJb-rjNYBg",
  authDomain: "flowbuddy-vi7rt.firebaseapp.com",
  databaseURL: "https://flowbuddy-vi7rt-default-rtdb.firebaseio.com",
  projectId: "flowbuddy-vi7rt",
  storageBucket: "flowbuddy-vi7rt.firebasestorage.app",
  messagingSenderId: "885170360423",
  appId: "1:885170360423:web:e94217a42c9c6eaac184c2",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export { app };
