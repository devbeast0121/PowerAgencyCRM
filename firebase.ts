import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken as _signInWithCustomToken,
  signInAnonymously as _signInAnonymously,
  onAuthStateChanged as _onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  createUserWithEmailAndPassword as _createUserWithEmailAndPassword,
  signInWithEmailAndPassword as _signInWithEmailAndPassword,
  signOut as _signOut,
  updateProfile as _updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  collection as _collection,
  addDoc as _addDoc,
  setDoc as _setDoc,
  updateDoc as _updateDoc,
  deleteDoc as _deleteDoc,
  doc as _doc,
  query as _query,
  onSnapshot as _onSnapshot,
  serverTimestamp as _serverTimestamp
} from 'firebase/firestore';

// Fallback for development if global variables are missing
const rawConfig = typeof __firebase_config !== 'undefined' 
  ? __firebase_config 
  : JSON.stringify({ apiKey: "mock", authDomain: "mock", projectId: "mock" });

const firebaseConfig = JSON.parse(rawConfig);
// Check if we are using the fallback mock config
const isMock = firebaseConfig.apiKey === "mock" || !firebaseConfig.apiKey;

let app: any;
let auth: any;
let db: any;

// Define exports that will be either real SDK functions or mocks
let signInWithCustomToken: any;
let signInAnonymously: any;
let onAuthStateChanged: any;
let signInWithGoogleCalendar: any; 
let signInWithGoogle: any;
let createUserWithEmailAndPassword: any;
let signInWithEmailAndPassword: any;
let signOut: any;
let collection: any;
let addDoc: any;
let setDoc: any;
let updateDoc: any;
let deleteDoc: any;
let doc: any;
let query: any;
let onSnapshot: any;
let serverTimestamp: any;

if (!isMock) {
  // --- REAL FIREBASE INITIALIZATION ---
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  signInWithCustomToken = _signInWithCustomToken;
  signInAnonymously = _signInAnonymously;
  onAuthStateChanged = _onAuthStateChanged;
  createUserWithEmailAndPassword = _createUserWithEmailAndPassword;
  signInWithEmailAndPassword = _signInWithEmailAndPassword;
  signOut = _signOut;

  // Real Google Sign In with Calendar Scope (read + write)
  signInWithGoogleCalendar = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    const result = await signInWithPopup(auth, provider);
    return {
        user: result.user,
        credential: GoogleAuthProvider.credentialFromResult(result)
    };
  };

  // General Google Sign In (with Gmail scopes for real integration)
  // If user is already signed in (email/password), use linkWithPopup to get Gmail token
  // without switching the Firebase auth user — keeps Firestore data under the same UID.
  signInWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      const currentUser = auth.currentUser;
      if (currentUser) {
          try {
              // Try to link — gets the Gmail OAuth token without changing the auth user
              const result = await linkWithPopup(currentUser, provider);
              const credential = GoogleAuthProvider.credentialFromResult(result);
              return { user: result.user, credential };
          } catch (linkErr: any) {
              // Already linked or different account — fall back to getting token via signInWithPopup
              // but restore the original user session immediately after
              if (linkErr.code === 'auth/credential-already-in-use' || linkErr.code === 'auth/email-already-in-use' || linkErr.code === 'auth/provider-already-linked') {
                  const credential = GoogleAuthProvider.credentialFromError(linkErr);
                  return { user: currentUser, credential };
              }
              throw linkErr;
          }
      }
      // No user signed in — normal Google sign-in flow
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      return { user: result.user, credential };
  };

  
  collection = _collection;
  addDoc = _addDoc;
  setDoc = _setDoc;
  updateDoc = _updateDoc;
  deleteDoc = _deleteDoc;
  doc = _doc;
  query = _query;
  onSnapshot = _onSnapshot;
  serverTimestamp = _serverTimestamp;
} else {
  // --- MOCK IMPLEMENTATION (LocalStorage) ---
  console.log("%c SimpleCRM Demo Mode ", "background: #10b981; color: white; font-weight: bold; padding: 4px; border-radius: 4px;", "Running with local storage");
  
  app = {};
  auth = { currentUser: null };
  db = { _listeners: {} };

  // Helper to update mock user state
  const setMockUser = (user: any, authInstance: any) => {
      authInstance.currentUser = user;
      if (authInstance._onAuthStateChangedCallback) {
          authInstance._onAuthStateChangedCallback(user);
      }
      return user;
  };

  // Mock Auth Methods
  signInAnonymously = async (authInstance: any) => {
      const user = { 
          uid: 'demo-user-' + Math.random(), 
          isAnonymous: true, 
          displayName: 'Guest User', 
          email: null,
          photoURL: null
      };
      return { user: setMockUser(user, authInstance) };
  };
  
  signInWithCustomToken = async (authInstance: any, token: string) => {
      return signInAnonymously(authInstance);
  };

  signInWithGoogleCalendar = async () => {
      console.log("Mocking Google Calendar Sign In");
      const user = { 
          uid: 'google-user-' + Math.random(), 
          isAnonymous: false, 
          displayName: 'Google User', 
          email: 'user@gmail.com',
          photoURL: null
      };
      setMockUser(user, auth);
      return { user, credential: { accessToken: "mock_access_token" } };
  };

  signInWithGoogle = async () => {
      const user = { uid: 'google-' + Math.random(), displayName: 'Google User', email: 'test@gmail.com', photoURL: null };
      setMockUser(user, auth);
      return { user, credential: { accessToken: "mock_gmail_token" } };
  };


  createUserWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
      const user = { uid: 'email-' + Math.random(), displayName: email.split('@')[0], email, photoURL: null };
      return { user: setMockUser(user, authInstance) };
  };

  signInWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
      // Allow any login in mock mode
      const user = { uid: 'email-' + Math.random(), displayName: email.split('@')[0], email, photoURL: null };
      return { user: setMockUser(user, authInstance) };
  };

  signOut = async (authInstance: any) => {
      authInstance.currentUser = null;
      if (authInstance._onAuthStateChangedCallback) {
          authInstance._onAuthStateChangedCallback(null);
      }
  };

  onAuthStateChanged = (authInstance: any, callback: any) => {
      authInstance._onAuthStateChangedCallback = callback;
      // Always fire callback with current state (even if null)
      callback(authInstance.currentUser);
      return () => { authInstance._onAuthStateChangedCallback = null; };
  };

  // Mock Firestore Helper: LocalStorage
  const STORAGE_KEY = 'simple_crm_data_v1';
  
  const loadData = () => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  };
  
  const saveData = (data: any) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error("Storage full", e); }
  };

  const notifyListeners = (path: string) => {
      Object.keys(db._listeners || {}).forEach(key => {
          if (key.startsWith(path) || path.startsWith(key) || key === path.split('/').slice(0, -1).join('/')) { 
             const listeners = db._listeners[key];
             if(listeners) listeners.forEach((l:any) => l());
          }
      });
  };

  collection = (dbInstance: any, ...pathSegments: string[]) => ({ type: 'collection', path: pathSegments.join('/') });

  doc = (dbInstance: any, ...pathSegments: string[]) => {
      let basePath = '';
      let segments = pathSegments;
      if (dbInstance.path) basePath = dbInstance.path;
      const fullPath = basePath ? `${basePath}/${segments.join('/')}` : segments.join('/');
      return { type: 'doc', path: fullPath };
  };

  addDoc = async (collRef: any, data: any) => {
      const store = loadData();
      const id = 'doc_' + Date.now() + Math.random().toString(36).substr(2, 5);
      const docPath = collRef.path + '/' + id;
      const finalData = { ...data };
      if (finalData.createdAt && finalData.createdAt.type === 'serverTimestamp') {
          finalData.createdAt = { seconds: Math.floor(Date.now() / 1000) };
      }
      store[docPath] = { ...finalData, id };
      saveData(store);
      notifyListeners(collRef.path);
      return { id };
  };

  setDoc = async (docRef: any, data: any, options?: any) => {
      const store = loadData();
      const id = docRef.path.split('/').pop();
      const collPath = docRef.path.split('/').slice(0, -1).join('/');
      const existing = store[docRef.path] || {};
      const finalData = options?.merge ? { ...existing, ...data, id } : { ...data, id };
      store[docRef.path] = finalData;
      saveData(store);
      notifyListeners(collPath);
      return { id };
  };

  updateDoc = async (docRef: any, data: any) => {
      const store = loadData();
      if (store[docRef.path]) {
          store[docRef.path] = { ...store[docRef.path], ...data };
          saveData(store);
          notifyListeners(docRef.path);
      }
  };

  deleteDoc = async (docRef: any) => {
      const store = loadData();
      if (store[docRef.path]) {
          delete store[docRef.path];
          saveData(store);
          notifyListeners(docRef.path);
      }
  };

  query = (collRef: any) => collRef;

  onSnapshot = (queryRef: any, onNext: any, onError: any) => {
      if (!db._listeners) db._listeners = {};
      const path = queryRef.path;
      
      const callback = () => {
          const store = loadData();
          const docs = Object.keys(store)
              .filter(key => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1)
              .map(key => ({ 
                  id: key.split('/').pop(), 
                  data: () => store[key] 
              }));
          onNext({ docs, empty: docs.length === 0 });
      };

      if (!db._listeners[path]) db._listeners[path] = [];
      db._listeners[path].push(callback);
      setTimeout(callback, 0);

      return () => {
          if (db._listeners[path]) {
              db._listeners[path] = db._listeners[path].filter((cb: any) => cb !== callback);
          }
      };
  };

  serverTimestamp = () => ({ type: 'serverTimestamp', seconds: Math.floor(Date.now() / 1000) });
}

export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
export { 
  app, auth, db, 
  signInWithCustomToken, signInAnonymously, onAuthStateChanged, 
  signInWithGoogleCalendar, signInWithGoogle,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  collection, addDoc, setDoc, updateDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp
};