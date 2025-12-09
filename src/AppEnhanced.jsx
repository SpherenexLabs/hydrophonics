// import { useState } from 'react';
// import './App.css';
// import ImageUpload from './components/ImageUpload';
// import Scene3DEnhanced from './components/Scene3DEnhanced';
// import LoadingAnimation from './components/LoadingAnimation';
// import InventoryPanelEnhanced from './components/InventoryPanelEnhanced';
// import SaveSceneDialog from './components/SaveSceneDialog';

// function App() {
//   const [template, setTemplate] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [selectedObject, setSelectedObject] = useState(null);
//   const [sceneObjects, setSceneObjects] = useState(null);
//   const [showSaveDialog, setShowSaveDialog] = useState(false);

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

//   const handleReplaceObject = (newItem) => {
//     if (!sceneObjects) return;

//     const updatedObjects = { ...sceneObjects };

//     // If object is selected, replace it
//     if (selectedObject && updatedObjects[selectedObject]) {
//       updatedObjects[selectedObject] = {
//         ...updatedObjects[selectedObject],
//         model: newItem.model || newItem.id
//       };
//       setSceneObjects(updatedObjects);
//       setSelectedObject(null);
//     } 
//     // If no object selected, add new object to scene
//     else {
//       // Generate unique key for new object
//       let category = newItem.category || 'object';
      
//       // Ensure category is singular (remove trailing 's' if present)
//       if (category.endsWith('s') && category.length > 1) {
//         category = category.slice(0, -1); // 'chairs' -> 'chair', 'sofas' -> 'sofa'
//       }
      
//       const existingKeys = Object.keys(updatedObjects).filter(key => key.startsWith(category));
//       const nextIndex = existingKeys.length + 1;
//       const newKey = `${category}${nextIndex}`;

//       // Add new object at a random position with appropriate Y position based on category
//       const randomX = (Math.random() - 0.5) * 6; // -3 to 3
//       const randomZ = (Math.random() - 0.5) * 6; // -3 to 3
      
//       // Set appropriate Y position based on category (furniture sits on floor, lights hang from ceiling)
//       let yPosition = 0;
//       if (category === 'light') {
//         yPosition = 0; // Lights are positioned with their base at ground, bulb extends upward
//       } else {
//         yPosition = 0; // All furniture sits on the floor
//       }
      
//       console.log(`Adding new object: ${newKey} at position [${randomX}, ${yPosition}, ${randomZ}] with model: ${newItem.model || newItem.id}`);
      
//       updatedObjects[newKey] = {
//         position: [randomX, yPosition, randomZ],
//         model: newItem.model || newItem.id,
//         scale: 1 // Ensure scale is 1
//       };
      
//       setSceneObjects(updatedObjects);
//       setSelectedObject(newKey); // Auto-select the new object
//     }
//   };

//   const handleSaveScene = (sceneData) => {
//     setShowSaveDialog(true);
//   };

//   const handleSaveSuccess = (savedData) => {
//     console.log('Scene saved successfully:', savedData);
//   };

//   const handleDeleteObject = (objectKey) => {
//     if (!sceneObjects) return;
    
//     const updatedObjects = { ...sceneObjects };
//     delete updatedObjects[objectKey];
//     setSceneObjects(updatedObjects);
//     setSelectedObject(null);
//   };

//   const handleMoveObject = (objectKey, newPosition) => {
//     if (!sceneObjects || !sceneObjects[objectKey]) return;
    
//     const updatedObjects = { ...sceneObjects };
//     updatedObjects[objectKey] = {
//       ...updatedObjects[objectKey],
//       position: newPosition
//     };
//     setSceneObjects(updatedObjects);
//   };

//   const handleReset = () => {
//     setTemplate(null);
//     setSceneObjects(null);
//     setSelectedObject(null);
//     setIsLoading(false);
//   };

//   return (
//     <div className="app">
//       <header className="app-header">
//         <div className="header-content">
//           <div className="logo-section">
//             <div className="logo-icon">🏠</div>
//             <div className="logo-text">
//               <h1>2D to 3D Room Converter</h1>
//               <p className="tagline">Transform your floor plans into immersive 3D spaces</p>
//             </div>
//           </div>
//           {template && (
//             <div className="header-actions">
//               <button onClick={() => setShowSaveDialog(true)} className="header-btn save-btn">
//                 <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
//                 </svg>
//                 Save Scene
//               </button>
//               <button onClick={handleReset} className="header-btn reset-btn">
//                 <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                 </svg>
//                 Reset
//               </button>
//             </div>
//           )}
//         </div>
//       </header>

//       <main className="app-main">
//         {!template && !isLoading && (
//           <div className="upload-section">
//             <ImageUpload onTemplateMatch={handleTemplateMatch} />
//           </div>
//         )}

//         {isLoading && (
//           <div className="loading-section">
//             <LoadingAnimation onComplete={handleLoadingComplete} />
//           </div>
//         )}

//         {template && !isLoading && (
//           <div className="workspace">
//             <div className="scene-container">
//               <Scene3DEnhanced
//                 template={template}
//                 objects={sceneObjects}
//                 selectedObject={selectedObject}
//                 onObjectSelect={handleObjectSelect}
//                 onSaveScene={handleSaveScene}
//                 onDeleteObject={handleDeleteObject}
//                 onMoveObject={handleMoveObject}
//               />
//             </div>

//             <div className="inventory-container">
//               <InventoryPanelEnhanced
//                 selectedObject={selectedObject}
//                 onReplaceObject={handleReplaceObject}
//               />
//             </div>
//           </div>
//         )}
//       </main>

//       <SaveSceneDialog
//         isOpen={showSaveDialog}
//         onClose={() => setShowSaveDialog(false)}
//         sceneData={{
//           template_id: template?.id,
//           template_name: template?.name,
//           objects: sceneObjects
//         }}
//         onSaveSuccess={handleSaveSuccess}
//       />

//       <footer className="app-footer">
//         <div className="footer-content">
//           <p>&copy; 2024 2D to 3D Room Converter. Powered by Three.js & GSAP</p>
//           <div className="footer-links">
//             <a href="#" className="footer-link">Documentation</a>
//             <a href="#" className="footer-link">Support</a>
//             <a href="#" className="footer-link">GitHub</a>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }

// export default App;



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