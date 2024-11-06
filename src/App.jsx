import React from 'react';
import AnnotationCleaner from './components/AnnotationCleaner';
import IToBoSLogo from './assets/itoboslogo.png'; // Import the logo directly

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 mb-10 mt-10">
      <img src={IToBoSLogo} alt="Logo" className="mb-4 mx-auto" width={200} height={200} />
      <h1 className="text-2xl font-sans mb-4 text-center">Annotation Cleaning Tool</h1>
      <AnnotationCleaner />
    </div>
  );
}

export default App;