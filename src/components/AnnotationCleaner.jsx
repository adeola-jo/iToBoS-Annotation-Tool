// src/components/AnnotationCleaner.jsx

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Save, Undo, FolderOpen } from 'lucide-react';

const AnnotationCleaner = () => {
  // State declarations
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [image, setImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [clickPoint, setClickPoint] = useState(null);
  const [deletedAnnotations, setDeletedAnnotations] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [currentImagePath, setCurrentImagePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState(''); // State to store the selected directory

  // session managers
  const [sessionMode, setSessionMode] = useState('new');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const sessionData = useRef(null);
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);

    // Box annotation manager
    const [isDrawing, setIsDrawing] = useState(false);
    const [isDrawMode, setIsDrawMode] = useState(false);
    const [startPoint, setStartPoint] = useState(null);
    const [endPoint, setEndPoint] = useState(null);

  const handleProgressFile = async (baseDir, mode = 'read') => {
    const progressFilePath = window.electron.path.join(baseDir, 'cleaned_labels', 'annotation_progress.json');
    try {
        if (mode === 'read') {
            try {
                const progressData = await window.electron.readTextFile(progressFilePath);
                return JSON.parse(progressData);
            } catch (error) {
                return {
                    lastImageIndex: 0,
                    totalImages: 0,
                    lastModified: new Date().toISOString()
                };
            }
        } else if (mode === 'write') {
            const progressData = {
                lastImageIndex: currentImageIndex,
                totalImages: imageFiles.length,
                lastModified: new Date().toISOString()
            };
            await window.electron.writeFile(progressFilePath, JSON.stringify(progressData, null, 2));
        }
    } catch (error) {
        console.error('Error handling progress file:', error);
    }
  };

  const initializeDirectory = async (baseDir, startIndex = 0) => {
    try {
        // Use proper path joining for Windows compatibility
        const imagesPath = window.electron.path.join(baseDir, 'images');
        console.log('Reading from images path:', imagesPath);
        const files = await window.electron.readDirectory(imagesPath);
        
        // Ensure cleaned_labels directory exists
        const cleanedLabelsPath = window.electron.path.join(baseDir, 'cleaned_labels');
        await window.electron.ensureDir(cleanedLabelsPath);
        
        // Map files with proper path handling
        const mappedFiles = files.map(filename => ({
            imagePath: window.electron.path.join(imagesPath, filename),
            labelPath: window.electron.path.join(baseDir, 'labels', filename.replace(/\.(jpg|jpeg|png)$/i, '.txt'))
        }));

        console.log('Mapped files:', mappedFiles);
        
        if (mappedFiles.length === 0) {
            alert('No image files found in the selected directory');
            return;
        }

        setImageFiles(mappedFiles);
        setCurrentImageIndex(startIndex);
        await loadImageAndAnnotations(startIndex);
    } catch (error) {
        console.error('Error initializing directory:', error);
        alert('Error initializing directory: ' + error.message);
    }
};

const handleDirectorySelect = async () => {
    try {
        console.log('Attempting to select directory...');
        if (!window.electron) {
            console.error('Electron API not found in window object');
            return;
        }
        
        const result = await window.electron.selectDirectory();
        console.log('Directory selection result:', result);
        
        if (!result.canceled && result.filePaths.length > 0) {
            const baseDir = result.filePaths[0];
            console.log('Base directory:', baseDir);
            
            // First ensure the required directories exist
            const imagesDir = window.electron.path.join(baseDir, 'images');
            const labelsDir = window.electron.path.join(baseDir, 'labels');
            
            try {
                await window.electron.readDirectory(imagesDir);
                await window.electron.readDirectory(labelsDir);
            } catch (error) {
                alert('Selected directory must contain "images" and "labels" subdirectories');
                return;
            }

            const progressData = await handleProgressFile(baseDir, 'read') || { lastImageIndex: 0, totalImages: 0 }; // Ensure progressData is initialized
            setSelectedDirectory(baseDir); // Store the selected directory
            
            if (progressData.lastImageIndex > 0) {
                setShowRestoreModal(true);
                sessionData.current = {
                    baseDir,
                    progressData
                };
                return;
            }
            
            await initializeDirectory(baseDir, 0);
            //log the baseDir
        }
    } catch (error) {
        console.error('Error selecting directory:', error);
        alert('Error selecting directory: ' + error.message);
    }
};

const loadImageAndAnnotations = async (index) => {
    if (!imageFiles.length || index >= imageFiles.length) return;

    setLoading(true);
    try {
        const { imagePath, labelPath } = imageFiles[index];
        setCurrentImagePath(imagePath);

        // Load the image
        const imageBuffer = await window.electron.readFile(imagePath);
        const blob = new Blob([imageBuffer]);
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        await new Promise((resolve) => {
            img.onload = () => {
                setImage(img);
                const maxWidth = 800;
                const maxHeight = 600;
                let canvasWidth = img.width;
                let canvasHeight = img.height;

                if (canvasWidth > maxWidth) {
                    canvasHeight = (maxWidth / canvasWidth) * canvasHeight;
                    canvasWidth = maxWidth;
                }
                if (canvasHeight > maxHeight) {
                    canvasWidth = (maxHeight / canvasHeight) * canvasWidth;
                    canvasHeight = maxHeight;
                }

                if (canvasRef.current && originalCanvasRef.current) {
                    canvasRef.current.width = canvasWidth;
                    canvasRef.current.height = canvasHeight;
                    originalCanvasRef.current.width = canvasWidth;
                    originalCanvasRef.current.height = canvasHeight;
                }
                resolve();
            };
        });

        // Construct the cleaned label path
        const cleanedLabelPath = labelPath.replace(
            window.electron.path.sep + 'labels' + window.electron.path.sep,
            window.electron.path.sep + 'cleaned_labels' + window.electron.path.sep
        );

        // Check if the cleaned label file exists
        try {
            // Attempt to read from the cleaned labels
            const labelContent = await window.electron.readTextFile(cleanedLabelPath);
            const loadedAnnotations = labelContent
                .trim()
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.split(' ').map(Number));

            setAnnotations(loadedAnnotations); // Set the loaded annotations
            setDeletedAnnotations([]); // Reset deleted annotations
        } catch (error) {
            // If the cleaned label file does not exist, load original annotations
            console.warn('Cleaned label file not found, loading original annotations.');
            const originalLabelContent = await window.electron.readTextFile(labelPath);
            const originalAnnotations = originalLabelContent
                .trim()
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.split(' ').map(Number));

            setAnnotations(originalAnnotations); // Set the original annotations
            setDeletedAnnotations([]); // Reset deleted annotations
        }

    } catch (error) {
        console.error('Error loading image/annotations:', error);
        setAnnotations([]); // Reset annotations on error
    } finally {
        setLoading(false);
    }
};
//   const loadImageAndAnnotations = async (index) => {
//     if (!imageFiles.length || index >= imageFiles.length) return;

//     setLoading(true);
//     try {
//         const {imagePath, labelPath} = imageFiles[index];
//         setCurrentImagePath(imagePath);

//         const imageBuffer = await window.electron.readFile(imagePath);
//         const blob = new Blob([imageBuffer]);
//         const img = new Image();
//         img.src = URL.createObjectURL(blob);

//         await new Promise((resolve) => {
//             img.onload = () => {
//                 setImage(img);
//                 const maxWidth = 800;
//                 const maxHeight = 600;
//                 let canvasWidth = img.width;
//                 let canvasHeight = img.height;
                
//                 if (canvasWidth > maxWidth) {
//                     canvasHeight = (maxWidth / canvasWidth) * canvasHeight;
//                     canvasWidth = maxWidth;
//                 }
//                 if (canvasHeight > maxHeight) {
//                     canvasWidth = (maxHeight / canvasHeight) * canvasWidth;
//                     canvasHeight = maxHeight;
//                 }
                
//                 if (canvasRef.current && originalCanvasRef.current) {
//                     canvasRef.current.width = canvasWidth;
//                     canvasRef.current.height = canvasHeight;
//                     originalCanvasRef.current.width = canvasWidth;
//                     originalCanvasRef.current.height = canvasHeight;
//                 }
//                 resolve();
//             };
//         });

//         const labelContent = await window.electron.readTextFile(labelPath);
//         const loadedAnnotations = labelContent
//             .trim()
//             .split('\n')
//             .filter(line => line.trim())
//             .map(line => line.split(' ').map(Number));
        
//         setAnnotations(loadedAnnotations);
//         setDeletedAnnotations([]);
        
//     } catch (error) {
//         console.error('Error loading image/annotations:', error);
//         setAnnotations([]);
//     } finally {
//         setLoading(false);
//     }
//   };

    const saveAnnotations = async () => {
        if (!currentImagePath || !imageFiles.length) return;
        
        try {
            const {labelPath} = imageFiles[currentImageIndex];
            const cleanedLabelPath = labelPath.replace(
                window.electron.path.sep + 'labels' + window.electron.path.sep,
                window.electron.path.sep + 'cleaned_labels' + window.electron.path.sep
            );
            
            const cleanedDirPath = window.electron.path.dirname(cleanedLabelPath);
            await window.electron.ensureDir(cleanedDirPath);
            
            const content = annotations
                .map(ann => ann.join(' '))
                .join('\n');
            
            await window.electron.writeFile(cleanedLabelPath, content);
            
            const baseDir = window.electron.path.dirname(window.electron.path.dirname(cleanedLabelPath));
            await handleProgressFile(baseDir, 'write');
            
            console.log('Annotations saved successfully');
        } catch (error) {
            console.error('Error saving annotations:', error);
            alert('Error saving annotations: ' + error.message);
        }
    };

    const restoreAllAnnotations = async () => {
        try {
            const {labelPath} = imageFiles[currentImageIndex];
            const labelContent = await window.electron.readTextFile(labelPath);
            const originalAnnotations = labelContent
                .trim()
                .split('\n')
                .filter(line => line.trim())
                .map(line => line.split(' ').map(Number));
            
            setAnnotations(originalAnnotations);
            setDeletedAnnotations([]);
        } catch (error) {
            console.error('Error restoring annotations:', error);
        }
    };

    const findClosestDeletedAnnotation = (clickX, clickY) => {
        if (!deletedAnnotations.length) return null;
        
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        
        return deletedAnnotations.reduce((closest, ann) => {
            const [_, x_center, y_center, width, height] = ann;
            const boxX = x_center * canvasWidth;
            const boxY = y_center * canvasHeight;
            
            const distance = Math.sqrt(
                Math.pow(boxX - clickX, 2) + 
                Math.pow(boxY - clickY, 2)
            );
            
            if (!closest || distance < closest.distance) {
                return { annotation: ann, distance };
            }
            return closest;
        }, null);
    };

    const drawImage = () => {
        if (!image || !canvasRef.current || !originalCanvasRef.current) return;

        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        
        // Draw original image
        const origCtx = originalCanvasRef.current.getContext('2d');
        origCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        origCtx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

        // Draw annotated image
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

        // Draw bounding boxes
        annotations.forEach((ann, idx) => {
        const [classId, x_center, y_center, width, height] = ann;
        const x = x_center * canvasWidth - (width * canvasWidth / 2);
        const y = y_center * canvasHeight - (height * canvasHeight / 2);
        const w = width * canvasWidth;
        const h = height * canvasHeight;

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText(idx.toString(), x, y - 5);
        });

        if (clickPoint) {
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(clickPoint.x, clickPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        }

        if (isDrawMode) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            
            if (isDrawMode && isDrawing && startPoint && endPoint) {
                const width = endPoint.x - startPoint.x;
                const height = endPoint.y - startPoint.y;
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Change to semi-transparent for real-time visibility
                ctx.lineWidth = 2;
                ctx.strokeRect(startPoint.x, startPoint.y, width, height); // Draw the rectangle in real-time
            }
        }
    };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    
    const x = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * canvasHeight;
    setClickPoint({ x, y });

    if (e.shiftKey && deletedAnnotations.length > 0) {
        const closest = findClosestDeletedAnnotation(x, y);
        if (closest && closest.distance < 50) {
            const newDeleted = deletedAnnotations.filter(ann => ann !== closest.annotation);
            setDeletedAnnotations(newDeleted);
            setAnnotations([...annotations, closest.annotation]);
        }
        return;
    }

    const clickedIndex = annotations.findIndex((ann) => {
        const [_, x_center, y_center, width, height] = ann;
        const boxX = x_center * canvasWidth;
        const boxY = y_center * canvasHeight;
        const boxW = width * canvasWidth;
        const boxH = height * canvasHeight;

        return (
            x >= boxX - boxW/2 && x <= boxX + boxW/2 &&
            y >= boxY - boxH/2 && y <= boxY + boxH/2
        );
    });

    if (clickedIndex !== -1) {
        const newAnnotations = [...annotations];
        const deleted = newAnnotations.splice(clickedIndex, 1)[0];
        setDeletedAnnotations([...deletedAnnotations, deleted]);
        setAnnotations(newAnnotations);
    }
  };

    const handleUndo = () => {
        if (deletedAnnotations.length > 0) {
        const newDeleted = [...deletedAnnotations];
        const restored = newDeleted.pop();
        setDeletedAnnotations(newDeleted);
        setAnnotations([...annotations, restored]);
        }
    };

    const handleNext = async () => {
    if (currentImageIndex < imageFiles.length - 1) {
        await saveAnnotations();
        setCurrentImageIndex(prev => prev + 1);
    }
    };

    const handlePrevious = async () => {
    if (currentImageIndex > 0) {
        await saveAnnotations();
        setCurrentImageIndex(prev => prev - 1);
    }
    };

// Function to add a new annotation
    const addAnnotation = (newAnnotation) => {
        console.log("Before adding annotation:", annotations); // Log current annotations
        setAnnotations(prevAnnotations => {
            const updatedAnnotations = [...prevAnnotations, newAnnotation];
            console.log("After adding annotation:", updatedAnnotations); // Log updated annotations
            return updatedAnnotations; // Update the state with the new annotation
        });
        saveAnnotations(); // Save immediately after adding a new annotation
    };

    const isOverlapping = (newBox, existingBoxes) => {
        const [newX, newY, newWidth, newHeight] = newBox;

        for (const box of existingBoxes) {
            const [_, x, y, width, height] = box;

            // Check if the new box is inside the existing box
            if (
                newX >= x && 
                newY >= y && 
                newX + newWidth <= x + width && 
                newY + newHeight <= y + height
            ) {
                return true; // Overlapping
            }
        }
        return false; // No overlap
    };


    const deleteCleanedLabels = async () => {
        if (!selectedDirectory) {
            console.error('No directory selected.');
            return;
        }

        // const cleanedLabelsDir = `${selectedDirectory}/cleaned_labels`; // Construct the cleaned labels path
        const cleanedLabelsDir = window.electron.path.join(selectedDirectory, 'cleaned_labels'); 
        console.log('Cleaned labels directory:', cleanedLabelsDir);
        try {
            await window.electron.deleteCleanedLabels(cleanedLabelsDir); // Pass the path to the IPC method
            console.log('Cleaned labels deleted successfully.');
        } catch (error) {
            console.error('Error deleting cleaned labels:', error);
        }
    };
    
    const handleRefresh = () => {
        const userConfirmed = window.confirm('This action will delete the current session and cleaned labels, which is irreversible. Do you want to proceed?');
        if (userConfirmed) {
            deleteCleanedLabels(); // Call the function to delete cleaned labels
            const baseDir = selectedDirectory; // Use the currently selected directory
            handleProgressFile(baseDir, 'write'); // Create a new progress file
            window.location.reload(); // Refresh the page
        }
    };
// const handleMouseUp = () => {
//     if (isDrawMode && isDrawing && startPoint && endPoint) {
//         const canvasWidth = canvasRef.current.width;
//         const canvasHeight = canvasRef.current.height;

//         const x_min = Math.min(startPoint.x, endPoint.x);
//         const y_min = Math.min(startPoint.y, endPoint.y);
//         const width = Math.abs(endPoint.x - startPoint.x);
//         const height = Math.abs(endPoint.y - startPoint.y);

//         const x_center = (x_min + width / 2) / canvasWidth;
//         const y_center = (y_min + height / 2) / canvasHeight;
//         const norm_width = width / canvasWidth;
//         const norm_height = height / canvasHeight;

//         const newAnnotation = [0, x_center, y_center, norm_width, norm_height];
//         addAnnotation(newAnnotation); // Call addAnnotation to save the new annotation

//         setIsDrawing(false);
//         setStartPoint(null);
//         setEndPoint(null);
//     }
// };

  useEffect(() => {
    if (imageFiles.length) {
      setClickPoint(null);
      loadImageAndAnnotations(currentImageIndex);
    }
  }, [currentImageIndex, imageFiles]);
  useEffect(() => {
    const handleBeforeUnload = (event) => {
        const confirmationMessage = 'Are you sure you want to refresh? This action will delete the current session and cleaned labels, which is irreversible.';
        event.returnValue = confirmationMessage; // Standard way to show confirmation dialog
        return confirmationMessage; // For some browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
}, []);


  useEffect(() => {
    drawImage();
  }, [image, annotations, clickPoint]);

  useEffect(() => {
    const handleKeyPress = async (e) => {
      if (!imageFiles.length) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          if (currentImageIndex < imageFiles.length - 1) {
            await saveAnnotations();
            setCurrentImageIndex(prev => prev + 1);
          }
          break;
        case 'ArrowLeft':
          if (currentImageIndex > 0) {
            await saveAnnotations();
            setCurrentImageIndex(prev => prev - 1);
          }
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            handleUndo();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            await saveAnnotations();
          }
          break;

        case 'R':  // To draw rectangles
          setIsDrawMode(prev => !prev);
          setClickPoint(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentImageIndex, imageFiles, annotations]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      {/* <h1 className="text-2xl font-bold my-4">YOLO Annotation Cleaner</h1> */}
      <h1 className="text-2xl font-bold mb-10"></h1>

      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <button
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            onClick={handleDirectorySelect}
            disabled={loading}
          >
            <FolderOpen className="w-5 h-5" />
            Select Dataset Directory
          </button>
          
          <div className="flex gap-2 items-center">
            <button
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              onClick={handlePrevious}
              disabled={currentImageIndex === 0 || loading}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="p-2">
              {imageFiles.length ? `${currentImageIndex + 1} / ${imageFiles.length}` : 'No images loaded'}
            </span>
            <button
        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        onClick={handleNext}
        disabled={currentImageIndex === imageFiles.length - 1 || loading}
        >
        <ArrowRight className="w-5 h-5" />
        </button>
        </div>

        <div className="flex gap-2 items-center">
        <button
        className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400"
        onClick={handleUndo}
        disabled={!deletedAnnotations.length || loading}
        >
        <Undo className="w-5 h-5" />
        </button>


        <button className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        onClick={saveAnnotations}
        disabled={!currentImagePath || loading}
        >
        <Save className="w-5 h-5" />
        </button>
        <button
        className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        onClick={restoreAllAnnotations}
        disabled={!currentImagePath || loading}
        >
        Restore All
        </button>
        {/* <div className="text-sm text-gray-600 ml-2">
            Shift + Click to restore box
        </div> */}
        <button
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => {
                const userConfirmed = window.confirm('Are you sure you want to exit?');
                if (userConfirmed) {
                    window.electron.exitApp(); // Call the Electron method to close the application
                }
            }}
        >
            Exit Application
        </button>
        <div className="mt-2">
            <div className="text-sm text-gray-600">
                Please save your work to resume later.
            </div>
            <div className={`text-sm ${isDrawMode ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                Press 'R' to {isDrawMode ? 'exit' : 'enter'} drawing mode
            </div>
        </div>
        </div>
        </div>

        {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-4 rounded">Loading...</div>
        </div>
        )}

        <div className="flex gap-4 justify-center">
        <div className="border rounded p-2">
        <h3 className="text-center mb-2">Original Image</h3>
        <canvas
        ref={originalCanvasRef}
        className="border"
        />
        </div>
        <div className="border rounded p-2">
        <h3 className="text-center mb-2">Annotated Image (Click to Remove)</h3>

        {/* <canvas
        ref={canvasRef}
        className="border cursor-pointer"
        onClick={handleCanvasClick}
        /> */}

    <canvas
        ref={canvasRef}
        className={`border cursor-${isDrawMode ? 'crosshair' : 'pointer'}`}
        onClick={!isDrawMode ? handleCanvasClick : undefined}
        onMouseDown={(e) => {
            if (isDrawMode) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
                const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
                setStartPoint({ x, y });
                setIsDrawing(true);
            }
        }}
        onMouseMove={(e) => {
            if (isDrawMode && isDrawing) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
                const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
                setEndPoint({ x, y });
                drawImage(); // Call drawImage to update the canvas with the new rectangle
            }
        }}
        onMouseUp={() => {
            if (isDrawMode && isDrawing && startPoint && endPoint) {
                const canvasWidth = canvasRef.current.width;
                const canvasHeight = canvasRef.current.height;
                
                const x_min = Math.min(startPoint.x, endPoint.x);
                const y_min = Math.min(startPoint.y, endPoint.y);
                const width = Math.abs(endPoint.x - startPoint.x);
                const height = Math.abs(endPoint.y - startPoint.y);
                
                // Only add the annotation if the rectangle is valid (non-zero width and height)
                if (width > 0 && height > 0) {
                    const x_center = (x_min + width / 2) / canvasWidth;
                    const y_center = (y_min + height / 2) / canvasHeight;
                    const norm_width = width / canvasWidth;
                    const norm_height = height / canvasHeight;

                    const newAnnotation = [0, x_center, y_center, norm_width, norm_height];

                    //TODO: Check if the new annotation overlaps with any existing annotations and add a visual warning to the screen
                    addAnnotation(newAnnotation); // Call addAnnotation to save the new annotation
                }

                setIsDrawing(false);
                setStartPoint(null);
                setEndPoint(null);
            }
        }}
        onMouseLeave={() => {
            if (isDrawing) {
                setIsDrawing(false);
                setStartPoint(null);
                setEndPoint(null);
            }
        }}
    />

    </div>
    </div>

    <div className="mt-4 space-y-4">
    <div>
    <h3 className="font-bold">Current Annotations:</h3>
    <pre className="bg-gray-100 p-2 rounded">
    {annotations.map(ann => ann.join(' ')).join('\n')}
    </pre>
    </div>

    <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">Keyboard Shortcuts:</h3>
        <ul className="space-y-1">
            <li>R: Toggle box drawing mode</li>
            <li>→ or Space: Next image (auto-saves)</li>
            <li>←: Previous image (auto-saves)</li>
            <li>Ctrl/Cmd + Z: Undo last deletion</li>
            <li>Ctrl/Cmd + S: Manual save</li>
            <li>Shift + Click: Restore deleted box</li>
        </ul>
    </div>
    </div>

    {showRestoreModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
    <h3 className="text-lg font-bold mb-4">Previous Session Found</h3>
    <p className="mb-4">
    Would you like to continue from where you left off? 
    (Image {sessionData.current.progressData.lastImageIndex + 1} of {sessionData.current.progressData.totalImages})
    </p>
    <div className="flex gap-4 justify-end">
    <button
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        onClick={() => {
        setShowRestoreModal(false);
        initializeDirectory(sessionData.current.baseDir, 0);
        handleRefresh();
        }}
    >
        Start Fresh
    </button>
    <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => {
        setShowRestoreModal(false);
        initializeDirectory(
            sessionData.current.baseDir,
            sessionData.current.progressData.lastImageIndex
        );
        }}
    >
        Continue
    </button>
    </div>
    </div>
    </div>
    )}
    </div>
    </div>
    );
};

export default AnnotationCleaner;