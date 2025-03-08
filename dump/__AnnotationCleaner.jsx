// import React, { useState, useRef, useEffect } from 'react';
// import { ArrowLeft, ArrowRight, Save, Undo, FolderOpen } from 'lucide-react';

// const AnnotationCleaner = () => {
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const [image, setImage] = useState(null);
//   const [annotations, setAnnotations] = useState([]);
//   const [clickPoint, setClickPoint] = useState(null);
//   const [deletedAnnotations, setDeletedAnnotations] = useState([]);
//   const [imageFiles, setImageFiles] = useState([]);
//   const [currentImagePath, setCurrentImagePath] = useState('');
//   const [loading, setLoading] = useState(false);
//   const canvasRef = useRef(null);
//   const originalCanvasRef = useRef(null);

//   const loadImageAndAnnotations = async (index) => {
//     if (!imageFiles.length || index >= imageFiles.length) return;

//     setLoading(true);
//     try {
//       const imagePath = imageFiles[index];
//       setCurrentImagePath(imagePath);

//       // Load image
//       const imageBuffer = await window.electron.readFile(imagePath);
//       const blob = new Blob([imageBuffer]);
//       const img = new Image();
//       img.src = URL.createObjectURL(blob);

//       await new Promise((resolve) => {
//         img.onload = () => {
//           setImage(img);
          
//           // Calculate canvas size while maintaining aspect ratio
//           const maxWidth = 800;
//           const maxHeight = 600;
//           let canvasWidth = img.width;
//           let canvasHeight = img.height;
          
//           if (canvasWidth > maxWidth) {
//             canvasHeight = (maxWidth / canvasWidth) * canvasHeight;
//             canvasWidth = maxWidth;
//           }
//           if (canvasHeight > maxHeight) {
//             canvasWidth = (maxHeight / canvasHeight) * canvasWidth;
//             canvasHeight = maxHeight;
//           }
          
//           if (canvasRef.current && originalCanvasRef.current) {
//             canvasRef.current.width = canvasWidth;
//             canvasRef.current.height = canvasHeight;
//             originalCanvasRef.current.width = canvasWidth;
//             originalCanvasRef.current.height = canvasHeight;
//           }
//           resolve();
//         };
//       });

//       // Load corresponding label file
//       const labelPath = imagePath.replace('/images/', '/labels/').replace(/\.(jpg|jpeg|png)$/i, '.txt');
//       const labelContent = await window.electron.readTextFile(labelPath);
//       const loadedAnnotations = labelContent
//         .trim()
//         .split('\n')
//         .filter(line => line.trim())
//         .map(line => line.split(' ').map(Number));
      
//       setAnnotations(loadedAnnotations);
//       setDeletedAnnotations([]);
      
//     } catch (error) {
//       console.error('Error loading image/annotations:', error);
//       setAnnotations([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDirectorySelect = async () => {
//     try {
//       const result = await window.electron.selectDirectory();
//       if (!result.canceled) {
//         const imagesPath = `${result.filePaths[0]}/images`;
//         const files = await window.electron.readDirectory(imagesPath);
//         setImageFiles(files);
//         setCurrentImageIndex(0);
//         await loadImageAndAnnotations(0);
//       }
//     } catch (error) {
//       console.error('Error selecting directory:', error);
//     }
//   };

//   const saveAnnotations = async () => {
//     if (!currentImagePath) return;
    
//     try {
//       const labelPath = currentImagePath.replace('/images/', '/labels/').replace(/\.(jpg|jpeg|png)$/i, '.txt');
//       const content = annotations
//         .map(ann => ann.join(' '))
//         .join('\n');
      
//       await window.electron.writeFile(labelPath, content);
//       console.log('Annotations saved successfully');
//     } catch (error) {
//       console.error('Error saving annotations:', error);
//     }
//   };

//   useEffect(() => {
//     if (imageFiles.length) {
//       loadImageAndAnnotations(currentImageIndex);
//     }
//   }, [currentImageIndex, imageFiles]);

//   const drawImage = () => {
//     if (!image || !canvasRef.current || !originalCanvasRef.current) return;

//     const canvasWidth = canvasRef.current.width;
//     const canvasHeight = canvasRef.current.height;
    
//     // Draw original image
//     const origCtx = originalCanvasRef.current.getContext('2d');
//     origCtx.clearRect(0, 0, canvasWidth, canvasHeight);
//     origCtx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

//     // Draw annotated image
//     const ctx = canvasRef.current.getContext('2d');
//     ctx.clearRect(0, 0, canvasWidth, canvasHeight);
//     ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

//     // Draw bounding boxes
//     annotations.forEach((ann, idx) => {
//       const [classId, x_center, y_center, width, height] = ann;
//       const x = (x_center - width/2) * canvasWidth;
//       const y = (y_center - height/2) * canvasHeight;
//       const w = width * canvasWidth;
//       const h = height * canvasHeight;

//       ctx.strokeStyle = 'red';
//       ctx.lineWidth = 2;
//       ctx.strokeRect(x, y, w, h);
      
//       // Add index label
//       ctx.fillStyle = 'red';
//       ctx.font = '16px Arial';
//       ctx.fillText(idx.toString(), x, y - 5);
//     });

//     // Draw click point
//     if (clickPoint) {
//       ctx.fillStyle = 'blue';
//       ctx.beginPath();
//       ctx.arc(clickPoint.x, clickPoint.y, 5, 0, 2 * Math.PI);
//       ctx.fill();
//     }
//   };

//   useEffect(() => {
//     drawImage();
//   }, [image, annotations, clickPoint]);

//   const handleCanvasClick = (e) => {
//     const rect = canvasRef.current.getBoundingClientRect();
//     const canvasWidth = canvasRef.current.width;
//     const canvasHeight = canvasRef.current.height;
    
//     // Get click coordinates relative to canvas
//     const x = ((e.clientX - rect.left) / rect.width) * canvasWidth;
//     const y = ((e.clientY - rect.top) / rect.height) * canvasHeight;
//     setClickPoint({ x, y });

//     // Check if click is inside any box
//     const clickedIndex = annotations.findIndex((ann) => {
//       const [_, x_center, y_center, width, height] = ann;
//       const boxX = (x_center - width/2) * canvasWidth;
//       const boxY = (y_center - height/2) * canvasHeight;
//       const boxW = width * canvasWidth;
//       const boxH = height * canvasHeight;

//       return (
//         x >= boxX && x <= boxX + boxW &&
//         y >= boxY && y <= boxY + boxH
//       );
//     });

//     if (clickedIndex !== -1) {
//       const newAnnotations = [...annotations];
//       const deleted = newAnnotations.splice(clickedIndex, 1)[0];
//       setDeletedAnnotations([...deletedAnnotations, deleted]);
//       setAnnotations(newAnnotations);
//     }
//   };

//   const handleUndo = () => {
//     if (deletedAnnotations.length > 0) {
//       const newDeleted = [...deletedAnnotations];
//       const restored = newDeleted.pop();
//       setDeletedAnnotations(newDeleted);
//       setAnnotations([...annotations, restored]);
//     }
//   };

//   const handleNext = async () => {
//     if (currentImageIndex < imageFiles.length - 1) {
//       await saveAnnotations();
//       setCurrentImageIndex(prev => prev + 1);
//     }
//   };

//   const handlePrevious = async () => {
//     if (currentImageIndex > 0) {
//       await saveAnnotations();
//       setCurrentImageIndex(prev => prev - 1);
//     }
//   };

//   // Add keyboard event listener
//   useEffect(() => {
//     const handleKeyPress = async (e) => {
//       if (!imageFiles.length) return;

//       switch (e.key) {
//         case 'ArrowRight':
//         case ' ': // Spacebar
//         // Continuing src/components/AnnotationCleaner.jsx

//         if (currentImageIndex < imageFiles.length - 1) {
//           await saveAnnotations();
//           setCurrentImageIndex(prev => prev + 1);
//         }
//         break;
//       case 'ArrowLeft':
//         if (currentImageIndex > 0) {
//           await saveAnnotations();
//           setCurrentImageIndex(prev => prev - 1);
//         }
//         break;
//       case 'z':
//         if (e.ctrlKey || e.metaKey) {
//           handleUndo();
//         }
//         break;
//       case 's':
//         if (e.ctrlKey || e.metaKey) {
//           e.preventDefault();
//           await saveAnnotations();
//         }
//         break;
//     }
//   };

//   window.addEventListener('keydown', handleKeyPress);
//   return () => window.removeEventListener('keydown', handleKeyPress);
// }, [currentImageIndex, imageFiles, annotations]);

// return (
//   <div className="p-4 max-w-6xl mx-auto">
//     <div className="flex justify-between items-center mb-4">
//       <button
//         className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
//         onClick={handleDirectorySelect}
//         disabled={loading}
//       >
//         <FolderOpen className="w-5 h-5" />
//         Select Dataset Directory
//       </button>
      
//       <div className="flex gap-2 items-center">
//         <button
//           className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
//           onClick={handlePrevious}
//           disabled={currentImageIndex === 0 || loading}
//         >
//           <ArrowLeft className="w-5 h-5" />
//         </button>
//         <span className="p-2">
//           {imageFiles.length ? `${currentImageIndex + 1} / ${imageFiles.length}` : 'No images loaded'}
//         </span>
//         <button
//           className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
//           onClick={handleNext}
//           disabled={currentImageIndex === imageFiles.length - 1 || loading}
//         >
//           <ArrowRight className="w-5 h-5" />
//         </button>
//       </div>

//       <div className="flex gap-2">
//         <button
//           className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
//           onClick={handleUndo}
//           disabled={!deletedAnnotations.length || loading}
//         >
//           <Undo className="w-5 h-5" />
//         </button>
//         <button
//           className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
//           onClick={saveAnnotations}
//           disabled={!currentImagePath || loading}
//         >
//           <Save className="w-5 h-5" />
//         </button>
//       </div>
//     </div>
    
//     {loading && (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
//         <div className="bg-white p-4 rounded">Loading...</div>
//       </div>
//     )}
    
//     <div className="flex gap-4">
//       <div className="border rounded p-2">
//         <h3 className="text-center mb-2">Original Image</h3>
//         <canvas
//           ref={originalCanvasRef}
//           className="border"
//         />
//       </div>
//       <div className="border rounded p-2">
//         <h3 className="text-center mb-2">Annotated Image (Click to Remove)</h3>
//         <canvas
//           ref={canvasRef}
//           className="border cursor-pointer"
//           onClick={handleCanvasClick}
//         />
//       </div>
//     </div>
    
//     <div className="mt-4 space-y-4">
//       <div>
//         <h3 className="font-bold">Current Annotations:</h3>
//         <pre className="bg-gray-100 p-2 rounded">
//           {annotations.map(ann => ann.join(' ')).join('\n')}
//         </pre>
//       </div>

//       <div className="bg-gray-100 p-4 rounded">
//         <h3 className="font-bold mb-2">Keyboard Shortcuts:</h3>
//         <ul className="space-y-1">
//           <li>→ or Space: Next image (auto-saves)</li>
//           <li>←: Previous image (auto-saves)</li>
//           <li>Ctrl/Cmd + Z: Undo last deletion</li>
//           <li>Ctrl/Cmd + S: Manual save</li>
//         </ul>
//       </div>
//     </div>
//   </div>
// );
// };

// export default AnnotationCleaner;




import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Save, Undo, FolderOpen } from 'lucide-react';

const AnnotationCleaner = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageFiles, setImageFiles] = useState([]);

  const handleDirectorySelect = async () => {
    console.log('Select directory button clicked');
    try {
      if (!window.electron) {
        console.error('Electron API not available');
        return;
      }

      const result = await window.electron.selectDirectory();
      console.log('Directory selection result:', result);
      
      if (!result.canceled && result.filePaths.length > 0) {
        console.log('Selected directory:', result.filePaths[0]);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          onClick={handleDirectorySelect}
        >
          <FolderOpen className="w-5 h-5" />
          Select Dataset Directory
        </button>
        
        <div className="flex gap-2">
          <button
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={true}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="p-2">
            No images loaded
          </span>
          <button
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={true}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="text-center p-8 bg-gray-100 rounded">
        Select a dataset directory to begin
      </div>
    </div>
  );
};

export default AnnotationCleaner;