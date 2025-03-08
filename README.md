
# iToBoS Annotation Tool

![iToBoS Logo](src/assets/itoboslogo.png)

A desktop application built with React, Electron, and Vite for cleaning and managing annotations in YOLO format for the iToBoS project. This tool allows users to easily view, edit, and manage bounding box annotations for image datasets.

![Demo GIF](demo.gif)

## Features

- **Visual Annotation Management**: View and edit bounding box annotations directly on images
- **Simple Interface**: Intuitive UI for removing unwanted annotations with a single click
- **Keyboard Shortcuts**: Efficiently navigate and edit using keyboard shortcuts
- **Undo Functionality**: Easily restore accidentally deleted annotations
- **Automatic Saving**: Changes are saved when moving between images

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (included with Node.js)

### Setup

1. Clone the repository
2. Install dependencies:

```
npm install
```

3. Run the development version:

```
npm run electron:dev
```

4. Build for distribution:

```
npm run electron:build
```

## Usage

1. Click "Select Dataset Directory" to choose a folder containing:
   - An `images` subfolder with image files (jpg, jpeg, png)
   - A `labels` subfolder with corresponding YOLO format annotation files (txt)

2. Navigate between images using arrow buttons or keyboard shortcuts:
   - **→** or **Space**: Next image (auto-saves)
   - **←**: Previous image (auto-saves)
   - **Ctrl/Cmd + Z**: Undo last deletion
   - **Ctrl/Cmd + S**: Manual save

3. Remove annotations by clicking on bounding boxes

4. Changes are automatically saved when navigating between images or can be saved manually using the save button

## Directory Structure

```
iToBoS-Annotation-Tool/
├── electron/             # Electron main process code
│   ├── main.cjs          # Main electron process
│   └── preload.cjs       # Preload script for IPC
├── src/                  # React application
│   ├── assets/           # Static assets like images
│   ├── components/       # React components
│   │   └── AnnotationCleaner.jsx  # Main annotation tool component
│   ├── App.jsx           # Root React component
│   └── main.jsx          # React entry point
└── ...
```

## Technical Details

- **Frontend**: React with TailwindCSS for styling
- **Desktop Integration**: Electron for file system access and native features
- **Build Tools**: Vite for fast development and optimized builds
- **Annotation Format**: YOLO format (class_id, x_center, y_center, width, height)

## Development

- Start development server: `npm run dev`
- Run Electron development mode: `npm run electron:dev`
- Build for production: `npm run electron:build`

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
