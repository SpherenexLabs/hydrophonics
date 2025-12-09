// import { useState } from 'react';
// import './App.css';
// import ImageUpload from './components/ImageUpload';
// import Scene3D from './components/Scene3D';
// import LoadingAnimation from './components/LoadingAnimation';
// import InventoryPanel from './components/InventoryPanel';
// import ProcessFlow from './components/ProcessFlow';

// function App() {
//   const [template, setTemplate] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [selectedObject, setSelectedObject] = useState(null);
//   const [sceneObjects, setSceneObjects] = useState(null);

//   const handleTemplateMatch = (matchedTemplate) => {
//     setIsLoading(true);
//     // Simulate loading time for animation
//     setTimeout(() => {
//       setTemplate(matchedTemplate);
//       setSceneObjects(matchedTemplate.objects);
//       setIsLoading(false);
//     }, 100);
//   };

//   const handleLoadingComplete = () => {
//     setIsLoading(false);
//   };

//   const handleObjectSelect = (objectKey) => {
//     setSelectedObject(objectKey);
//   };

//   const handleReplaceObject = (objectKey, newItem) => {
//     if (!sceneObjects) return;

//     const updatedObjects = { ...sceneObjects };
//     if (updatedObjects[objectKey]) {
//       // Keep the position but update the model
//       updatedObjects[objectKey] = {
//         ...updatedObjects[objectKey],
//         model: newItem.model
//       };
//       setSceneObjects(updatedObjects);
//       setSelectedObject(null);
//     }
//   };

//   const handleReset = () => {
//     setTemplate(null);
//     setSceneObjects(null);
//     setSelectedObject(null);
//     setIsLoading(false);
//   };

//   return (
//     <div className="app-container">
//       {isLoading && <LoadingAnimation onComplete={handleLoadingComplete} />}
      
//       <header className="app-header">
//         <div className="header-content">
//           <h1>2D to 3D Room Converter</h1>
//           <p>Upload a 2D layout and visualize it in 3D</p>
//         </div>
//         {template && (
//           <button onClick={handleReset} className="reset-btn">
//             <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//             </svg>
//             New Project
//           </button>
//         )}
//       </header>

//       <main className="app-main">
//         {!template ? (
//           <div className="upload-view">
//             <ProcessFlow />
//             <ImageUpload onTemplateMatch={handleTemplateMatch} />
//           </div>
//         ) : (
//           <div className="editor-view">
//             <div className="editor-left">
//               <Scene3D 
//                 template={template}
//                 objects={sceneObjects}
//                 onObjectSelect={handleObjectSelect}
//                 selectedObject={selectedObject}
//               />
//             </div>
//             <div className="editor-right">
//               <InventoryPanel 
//                 onItemSelect={(item) => console.log('Item selected:', item)}
//                 selectedObject={selectedObject}
//                 onReplaceObject={handleReplaceObject}
//               />
//             </div>
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }

// export default App;

import React from 'react'
import './App.css'
// import StudentDashboard from './components/StudentDashboard'
// import Hydrophonics from './components/Hydrophonics'
import Hydrophonics_Advanced from './components/Hydrophonics_Advanced'
// import Farmer from './components/Farmer'
function App() {
  return (
    <div>
      {/* <StudentDashboard /> */}
      {/* <Hydrophonics/> */}
      <Hydrophonics_Advanced/>
      {/* <Farmer/> */}
    </div>
  )
}

export default App