// 'use client';

// import React, { useState, useEffect, useRef } from 'react';
// import { faceAPI, deviceAPI, roomAPI, authAPI } from '@/lib/api';
// import { useAuthStore } from '@/stores/authStore';
// import { Camera, Plus, Trash2, User, Check, X, Lock, Upload, DoorOpen, MapPin, Loader2, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Badge } from "@/components/ui/badge"
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Checkbox } from "@/components/ui/checkbox"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import {
//   verifyFaceAndGetDoors,
//   enrollFaceWithUserData,
//   unlockMultipleDoors
// } from './service';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// function CameraPermissionChecker() {
//   const [permissionState, setPermissionState] = useState<string>('checking');
//   const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
//   const [browserInfo, setBrowserInfo] = React.useState<string>('');
//   const [isSecure, setIsSecure] = React.useState(false);
//   const [hasRequestedOnce, setHasRequestedOnce] = React.useState(false);

//   React.useEffect(() => {
//     checkEverything();
//   }, []);

//   const checkEverything = async () => {
//     const secure = window.location.protocol === 'https:' ||
//       window.location.hostname === 'localhost' ||
//       window.location.hostname === '127.0.0.1';
//     setIsSecure(secure);

//     const browser = navigator.userAgent;
//     setBrowserInfo(browser);

//     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//       setPermissionState('unsupported');
//       return;
//     }

//     try {
//       // Check permission state first
//       if (navigator.permissions && navigator.permissions.query) {
//         try {
//           // @ts-ignore
//           const result = await navigator.permissions.query({ name: 'camera' });
//           setPermissionState(result.state);
//           console.log('🔐 Camera permission state:', result.state);

//           result.onchange = () => {
//             setPermissionState(result.state);
//             console.log('🔐 Permission changed to:', result.state);
//             checkDevices(); // Recheck devices when permission changes
//           };

//           // If permission is granted, enumerate devices
//           if (result.state === 'granted') {
//             await checkDevices();
//           }
//         } catch (e) {
//           console.log('⚠️ Permission API not fully supported');
//           setPermissionState('unknown');
//           await checkDevices();
//         }
//       } else {
//         setPermissionState('unknown');
//         await checkDevices();
//       }
//     } catch (error) {
//       console.error('Error checking permissions:', error);
//       setPermissionState('error');
//     }
//   };

//   const checkDevices = async () => {
//     try {
//       const deviceList = await navigator.mediaDevices.enumerateDevices();
//       const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
//       setDevices(videoDevices);
//       console.log('📹 Video devices found:', videoDevices);
//     } catch (error) {
//       console.error('Error enumerating devices:', error);
//     }
//   };

//   const requestPermission = async () => {
//     try {
//       console.log('🎥 Requesting camera permission...');
//       setHasRequestedOnce(true);

//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: { facingMode: 'user' }
//       });

//       console.log('✅ Permission granted!');

//       // Stop the stream immediately
//       stream.getTracks().forEach(track => track.stop());

//       // Now enumerate devices - they should have labels now
//       await checkDevices();

//       // Update permission state
//       setPermissionState('granted');

//       alert('✅ Camera permission granted! You can now use face recognition.');
//     } catch (error: any) {
//       console.error('❌ Permission denied:', error);
//       setPermissionState('denied');

//       let errorMsg = 'Permission denied. ';
//       if (error.name === 'NotFoundError') {
//         errorMsg += 'No camera found on this device.';
//       } else if (error.name === 'NotAllowedError') {
//         errorMsg += 'Please allow camera access in your browser settings.';
//       } else {
//         errorMsg += error.message;
//       }

//       alert(`❌ ${errorMsg}`);
//     }
//   };

//   const resetPermission = () => {
//     alert(
//       '🔄 To reset camera permissions:\n\n' +
//       'Chrome/Edge:\n' +
//       '1. Click the 🔒 or 🛡️ icon in the address bar\n' +
//       '2. Click "Site settings"\n' +
//       '3. Find "Camera" and change to "Ask" or "Allow"\n' +
//       '4. Refresh the page\n\n' +
//       'Firefox:\n' +
//       '1. Click the 🛡️ icon in the address bar\n' +
//       '2. Click the X next to "Blocked Temporarily"\n' +
//       '3. Refresh the page\n\n' +
//       'Safari:\n' +
//       '1. Safari → Settings → Websites → Camera\n' +
//       '2. Change permission for this site\n' +
//       '3. Refresh the page'
//     );
//   };

//   const getStatusMessage = () => {
//     if (permissionState === 'granted') {
//       return '✅ Camera access granted';
//     } else if (permissionState === 'denied') {
//       return '❌ Camera access denied - Please reset permissions';
//     } else if (permissionState === 'prompt') {
//       return '⚠️ Camera permission required - Click "Request Camera Access"';
//     } else if (permissionState === 'unsupported') {
//       return '❌ Camera not supported in this browser';
//     } else if (!isSecure) {
//       return '❌ Camera requires HTTPS or localhost';
//     } else {
//       return '⚠️ Camera status unknown - Try requesting access';
//     }
//   };

//   return (
//     <Card className="mb-4 border-yellow-200 bg-yellow-50">
//       <CardHeader>
//         <CardTitle className="text-lg flex items-center gap-2">
//           <Camera className="w-5 h-5" />
//           Camera Diagnostics
//         </CardTitle>
//         <CardDescription>{getStatusMessage()}</CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-3">
//         <div className="grid grid-cols-2 gap-3 text-sm">
//           <div>
//             <strong>Permission Status:</strong>
//             <Badge variant={
//               permissionState === 'granted' ? 'default' :
//                 permissionState === 'denied' ? 'destructive' :
//                   'secondary'
//             } className="ml-2">
//               {permissionState}
//             </Badge>
//           </div>

//           <div>
//             <strong>Secure Context:</strong>
//             <Badge variant={isSecure ? 'default' : 'destructive'} className="ml-2">
//               {isSecure ? 'Yes (HTTPS/Localhost)' : 'No (HTTP)'}
//             </Badge>
//           </div>

//           <div>
//             <strong>Video Devices:</strong>
//             <span className="ml-2">
//               {permissionState === 'granted' ? `${devices.length} found` : 'Unknown (need permission)'}
//             </span>
//           </div>

//           <div>
//             <strong>API Support:</strong>
//             <Badge variant={navigator.mediaDevices ? 'default' : 'destructive'} className="ml-2">
//               {navigator.mediaDevices ? 'Supported' : 'Not Supported'}
//             </Badge>
//           </div>
//         </div>

//         {permissionState === 'granted' && devices.length > 0 && (
//           <div className="text-xs">
//             <strong>Available Cameras:</strong>
//             <ul className="list-disc list-inside ml-2 mt-1">
//               {devices.map((device, i) => (
//                 <li key={i}>{device.label || `Camera ${i + 1}`}</li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {!isSecure && (
//           <Alert variant="destructive">
//             <AlertCircle className="h-4 w-4" />
//             <AlertDescription>
//               ⚠️ You're on HTTP. Camera requires HTTPS or localhost!
//               <br />
//               <strong>Solution:</strong> Use localhost or enable HTTPS
//             </AlertDescription>
//           </Alert>
//         )}

//         {permissionState === 'denied' && (
//           <Alert variant="destructive">
//             <AlertCircle className="h-4 w-4" />
//             <AlertDescription>
//               Camera access was blocked. Click "How to Reset Permission" below.
//             </AlertDescription>
//           </Alert>
//         )}

//         <div className="flex gap-2 flex-wrap">
//           <Button
//             size="sm"
//             onClick={requestPermission}
//             disabled={!isSecure || permissionState === 'unsupported' || permissionState === 'granted'}
//           >
//             {permissionState === 'granted' ? '✅ Access Granted' : 'Request Camera Access'}
//           </Button>

//           <Button
//             size="sm"
//             variant="outline"
//             onClick={resetPermission}
//           >
//             How to Reset Permission
//           </Button>

//           <Button
//             size="sm"
//             variant="outline"
//             onClick={checkEverything}
//           >
//             <RefreshCw className="w-3 h-3 mr-1" />
//             Recheck
//           </Button>
//         </div>

//         <details className="text-xs">
//           <summary className="cursor-pointer font-semibold">Browser Info</summary>
//           <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto text-[10px]">{browserInfo}</pre>
//         </details>
//       </CardContent>
//     </Card>
//   );
// }

// interface Face {
//   face_id: string;
//   user_id?: string;
//   name: string;
//   email: string;
//   created_at: string;
//   recognition_count: number;
//   last_recognized: string | null;
// }

// interface DoorLock {
//   _id: string;
//   name: string;
//   status: string;
//   is_locked: boolean;
//   room: {
//     id: string | null;
//     name: string;
//   };
// }

// interface Room {
//   _id: string;
//   name: string;
//   description?: string;
// }

// interface UserOption {
//   id: string;
//   name: string;
//   email: string;
// }

// interface RecognitionResult {
//   matched: boolean;
//   user_id?: string;
//   name?: string;
//   email?: string;
//   confidence?: number;
//   distance?: number;
//   available_doors?: DoorLock[];
//   total_doors?: number;
//   recognition_count?: number;
//   message?: string;
// }

// export default function FaceRecognitionPage() {
//   const [faces, setFaces] = useState<Face[]>([]);
//   const [rooms, setRooms] = useState<Room[]>([]);
//   const [users, setUsers] = useState<UserOption[]>([]);
//   // ADD THESE NEW STATES FOR DEBUGGING
//   const [cameraError, setCameraError] = useState<string | null>(null);
//   const [cameraReady, setCameraReady] = useState(false);

//   // Dialog States
//   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
//   const [isRecognizeDialogOpen, setIsRecognizeDialogOpen] = useState(false);
//   const [deleteFaceId, setDeleteFaceId] = useState<string | null>(null);

//   // Step States
//   const [verifyStep, setVerifyStep] = useState<'room-select' | 'scanning'>('room-select');
//   const [enrollStep, setEnrollStep] = useState<'user-select' | 'capture'>('user-select');

//   // Data States
//   const [loading, setLoading] = useState(false);
//   const [isScanning, setIsScanning] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<string>('');
//   const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
//   const [selectedVerifyRoom, setSelectedVerifyRoom] = useState<string>('');

//   // Capture States
//   const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
//   const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
//   const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
//   const [selectedDoors, setSelectedDoors] = useState<string[]>([]);

//   // Refs
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const isScanningRef = useRef(false);

//   useEffect(() => {

//     fetchFaces();
//     fetchRooms();
//     fetchUsers();

//   }, []);

//   useEffect(() => {
//     let timer: NodeJS.Timeout;

//     if (isRecognizeDialogOpen && verifyStep === 'scanning') {
//       timer = setTimeout(() => startCamera(true), 100);
//     } else if (isAddDialogOpen && enrollStep === 'capture') {
//       timer = setTimeout(() => startCamera(false), 100);
//     } else {
//       stopCamera();
//       stopScanning();
//     }

//     return () => {
//       clearTimeout(timer);
//       stopCamera();
//       stopScanning();
//     };
//   }, [isRecognizeDialogOpen, isAddDialogOpen, verifyStep, enrollStep]);

//   const fetchFaces = async () => {
//     try {
//       const response = await faceAPI.getUserFaces();
//       setFaces(response.data.data);
//     } catch (error) {
//       console.error('Error fetching faces:', error);
//     }
//   };

//   const fetchRooms = async () => {
//     try {
//       const response = await roomAPI.getAll();
//       console.log("room", response.data.data);

//       setRooms(response.data.data || []);
//     } catch (error) {
//       console.error('Error fetching rooms:', error);
//     }
//   };

//   const fetchUsers = async () => {
//     try {
//       const response = await authAPI.getUsers();
//       console.log("users", response.data.data);
//       setUsers(response.data.data || []);
//     } catch (error) {
//       console.error('Error fetching users:', error);
//     }
//   };

//   const startCamera = async (autoScan: boolean) => {
//     console.log('🎥 Starting camera...', { autoScan });
//     setCameraError(null);
//     setCameraReady(false);

//     try {
//       // Check if mediaDevices is supported
//       if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//         throw new Error('Camera not supported in this browser');
//       }

//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//           facingMode: 'user'
//         }
//       });

//       console.log('✅ Camera stream obtained:', stream.getVideoTracks()[0].label);

//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;

//         // FIX 2: Wait for video to be ready before proceeding
//         videoRef.current.onloadedmetadata = () => {
//           console.log('✅ Video metadata loaded');
//           videoRef.current?.play().then(() => {
//             console.log('✅ Video playing');
//             setCameraReady(true);

//             if (autoScan) {
//               // FIX 3: Increase delay to ensure video is fully ready
//               setTimeout(() => {
//                 console.log('🔍 Starting auto-scan...');
//                 startScanning();
//               }, 1500);
//             }
//           }).catch(err => {
//             console.error('❌ Error playing video:', err);
//             setCameraError('Failed to play video stream');
//           });
//         };

//         videoRef.current.onerror = (e) => {
//           console.error('❌ Video error:', e);
//           setCameraError('Video stream error');
//         };
//       }
//     } catch (error: any) {
//       console.error('❌ Camera error:', error);
//       let errorMessage = 'Failed to access camera';

//       if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
//         errorMessage = 'Camera permission denied. Please allow camera access.';
//       } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
//         errorMessage = 'No camera found on this device.';
//       } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
//         errorMessage = 'Camera is being used by another application.';
//       } else if (error.message) {
//         errorMessage = error.message;
//       }

//       setCameraError(errorMessage);
//     }
//   };

//   const stopCamera = () => {
//     console.log('🛑 Stopping camera...');
//     if (videoRef.current && videoRef.current.srcObject) {
//       const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
//       tracks.forEach(track => {
//         track.stop();
//         console.log('🛑 Stopped track:', track.label);
//       });
//       videoRef.current.srcObject = null;
//     }
//     setCameraReady(false);
//     setCameraError(null);
//   };

//   const startScanning = () => {
//     if (isScanningRef.current) {
//       console.log('⚠️ Already scanning');
//       return;
//     }

//     // Check if video is ready
//     if (!videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
//       console.error('❌ Video not ready for scanning');
//       setCameraError('Video not ready. Please wait...');
//       return;
//     }

//     console.log('🔍 Starting scan loop...');
//     setIsScanning(true);
//     isScanningRef.current = true;
//     setRecognitionResult(null);

//     scanLoop();
//   };

//   const stopScanning = () => {
//     setIsScanning(false);
//     isScanningRef.current = false;
//   };

//   const scanLoop = async () => {
//     if (!isScanningRef.current || !videoRef.current) return;

//     const blob = await captureFrameToBlob();

//     if (blob) {
//       try {
//         // Use the helper function instead of direct API call
//         const result = await verifyFaceAndGetDoors(blob, selectedVerifyRoom);

//         if (result.matched) {
//           stopScanning();
//           setRecognitionResult(result);
//           setCapturedImageUrl(URL.createObjectURL(blob));

//           if (result.available_doors && result.available_doors.length > 0) {
//             setSelectedDoors(result.available_doors.map((door: DoorLock) => door._id));
//           }
//           return;
//         }
//       } catch (error: any) {
//         if (error.response?.status === 404) {
//           stopScanning();
//           setRecognitionResult({
//             matched: false,
//             message: 'Face not recognized. Please try again or enroll first.'
//           });
//           setCapturedImageUrl(URL.createObjectURL(blob));

//           setTimeout(() => resetAndRestartScan(), 3000);
//           return;
//         }
//         console.log("Scanning...");
//       }
//     }

//     if (isScanningRef.current) {
//       setTimeout(scanLoop, 1000);
//     }
//   };

//   const captureFrameToBlob = (): Promise<Blob | null> => {
//     return new Promise((resolve) => {
//       if (!videoRef.current || !canvasRef.current) {
//         console.error('❌ Video or canvas ref not available');
//         resolve(null);
//         return;
//       }

//       const video = videoRef.current;
//       const canvas = canvasRef.current;

//       // FIX 7: Check if video has valid dimensions
//       if (video.videoWidth === 0 || video.videoHeight === 0) {
//         console.error('❌ Video dimensions are 0');
//         resolve(null);
//         return;
//       }

//       const context = canvas.getContext('2d');
//       if (!context) {
//         console.error('❌ Could not get canvas context');
//         resolve(null);
//         return;
//       }

//       try {
//         canvas.width = video.videoWidth;
//         canvas.height = video.videoHeight;
//         context.drawImage(video, 0, 0);

//         canvas.toBlob((blob) => {
//           if (blob) {
//             console.log('✅ Frame captured:', blob.size, 'bytes');
//           } else {
//             console.error('❌ Failed to create blob from canvas');
//           }
//           resolve(blob);
//         }, 'image/jpeg', 0.8);
//       } catch (error) {
//         console.error('❌ Error capturing frame:', error);
//         resolve(null);
//       }
//     });
//   };

//   const handleManualCapture = async () => {
//     const blob = await captureFrameToBlob();
//     if (blob) {
//       setCapturedImage(blob);
//       setCapturedImageUrl(URL.createObjectURL(blob));
//       stopScanning();
//     }
//   };

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       setCapturedImage(file);
//       setCapturedImageUrl(URL.createObjectURL(file));
//       stopScanning();
//       stopCamera();
//     }
//   };

//   const handleEnrollFace = async () => {
//     if (!capturedImage || !selectedUser || selectedRooms.length === 0) {
//       alert('Please select a user, capture an image, and select at least one room');
//       return;
//     }

//     setLoading(true);
//     try {
//       await enrollFaceWithUserData(selectedUser, selectedRooms, capturedImage);
//       await fetchFaces();
//       setIsAddDialogOpen(false);
//       resetEnrollForm();
//       alert('✅ Face enrolled successfully!');
//     } catch (error: any) {
//       alert(error.response?.data?.message || error.message || 'Failed to enroll face');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleUnlockDoors = async () => {
//     if (selectedDoors.length === 0) return;

//     setLoading(true);
//     try {
//       const results = await unlockMultipleDoors(selectedDoors);
//       const successCount = results.filter(r => r.success).length;

//       if (successCount === selectedDoors.length) {
//         alert(`✅ Successfully unlocked ${successCount} door(s)!`);
//       } else {
//         alert(`⚠️ Unlocked ${successCount}/${selectedDoors.length} doors. Some failed.`);
//       }

//       setIsRecognizeDialogOpen(false);
//       resetVerifyDialog();
//     } catch (error: any) {
//       alert('Failed to unlock doors');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDeleteFace = async () => {
//     if (!deleteFaceId) return;
//     try {
//       await faceAPI.deleteFace(deleteFaceId);
//       await fetchFaces();
//       setDeleteFaceId(null);
//     } catch (error) {
//       alert('Failed to delete face');
//     }
//   };

//   const resetCapture = () => {
//     setCapturedImage(null);
//     setCapturedImageUrl(null);
//     setRecognitionResult(null);
//     setSelectedDoors([]);
//     stopScanning();
//   };

//   const resetAndRestartScan = () => {
//     resetCapture();
//     startCamera(true);
//   };

//   const resetVerifyDialog = () => {
//     setVerifyStep('room-select');
//     setSelectedVerifyRoom('');
//     resetCapture();
//   };

//   const resetEnrollForm = () => {
//     setEnrollStep('user-select');
//     setSelectedUser('');
//     setSelectedRooms([]);
//     resetCapture();
//   };

//   const toggleRoomSelection = (roomId: string) => {
//     setSelectedRooms(prev =>
//       prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
//     );
//   };

//   const toggleDoorSelection = (doorId: string) => {
//     setSelectedDoors(prev =>
//       prev.includes(doorId) ? prev.filter(id => id !== doorId) : [...prev, doorId]
//     );
//   };

//   const proceedToScanning = () => {
//     if (!selectedVerifyRoom) {
//       alert('Please select a room first');
//       return;
//     }
//     setVerifyStep('scanning');
//   };

//   const proceedToCapture = () => {
//     if (!selectedUser || selectedRooms.length === 0) {
//       alert('Please select a user and at least one room');
//       return;
//     }
//     setEnrollStep('capture');
//   };

//   // FIX 8: Updated useEffect with better timing
//   useEffect(() => {
//     let mounted = true;

//     const initCamera = async () => {
//       if (isRecognizeDialogOpen && verifyStep === 'scanning' && mounted) {
//         await startCamera(true);
//       } else if (isAddDialogOpen && enrollStep === 'capture' && mounted) {
//         await startCamera(false);
//       } else {
//         stopCamera();
//         stopScanning();
//       }
//     };

//     // Small delay to ensure DOM is ready
//     const timer = setTimeout(initCamera, 200);

//     return () => {
//       mounted = false;
//       clearTimeout(timer);
//       stopCamera();
//       stopScanning();
//     };
//   }, [isRecognizeDialogOpen, isAddDialogOpen, verifyStep, enrollStep]);


//   return (
//     <div className="container mx-auto p-8">
//       <CameraPermissionChecker />
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h1 className="text-3xl font-bold">Face Recognition</h1>
//           <p className="text-muted-foreground">AI-powered facial recognition for door access</p>
//         </div>
//         <div className="flex space-x-2">

//           {/* VERIFY FACE DIALOG */}
//           <Dialog open={isRecognizeDialogOpen} onOpenChange={(open) => {
//             setIsRecognizeDialogOpen(open);
//             if (!open) { resetVerifyDialog(); }
//           }}>
//             <DialogTrigger asChild>
//               <Button variant="outline">
//                 <Camera className="w-4 h-4 mr-2" />
//                 Verify Face
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle>Face Verification</DialogTitle>
//                 <DialogDescription>
//                   {verifyStep === 'room-select' ? 'Select a room to verify access' : isScanning ? 'Position your face in the camera' : 'Verification complete'}
//                 </DialogDescription>
//               </DialogHeader>

//               {verifyStep === 'room-select' ? (
//                 <div className="space-y-4 py-4">
//                   <div className="space-y-2">
//                     <Label>Select Room</Label>
//                     <Select value={selectedVerifyRoom} onValueChange={setSelectedVerifyRoom}>
//                       <SelectTrigger>
//                         <SelectValue placeholder="Choose a room to verify access" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {rooms.map(room => (
//                           <SelectItem key={room._id} value={room._id}>
//                             <div className="flex items-center gap-2">
//                               <MapPin className="w-4 h-4" />
//                               {room.name}
//                             </div>
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <Button onClick={proceedToScanning} className="w-full" disabled={!selectedVerifyRoom}>
//                     Continue to Scan
//                     <ArrowRight className="w-4 h-4 ml-2" />
//                   </Button>
//                 </div>
//               ) : (
//                 <Tabs defaultValue="camera" className="w-full">
//                   <TabsContent value="camera" className="space-y-4">
//                     {cameraError && (
//                       <Alert variant="destructive">
//                         <AlertCircle className="h-4 w-4" />
//                         <AlertDescription>{cameraError}</AlertDescription>
//                       </Alert>
//                     )}
//                     {!recognitionResult ? (
//                       <div className="relative bg-black rounded-lg overflow-hidden min-h-[400px] flex items-center justify-center">
//                         {/* FIX 10: Add loading indicator while camera initializes */}
//                         {!cameraReady && !cameraError && (
//                           <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-40">
//                             <div className="text-white text-center">
//                               <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
//                               <p>Initializing camera...</p>
//                             </div>
//                           </div>
//                         )}

//                         <video
//                           ref={videoRef}
//                           autoPlay
//                           playsInline
//                           muted
//                           className="w-full h-full object-cover"
//                           style={{ display: cameraReady ? 'block' : 'none' }}
//                         />

//                         {isScanning && cameraReady && (
//                           <>
//                             <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none z-10"></div>
//                             <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-scan z-20 opacity-80"></div>
//                             <div className="absolute bottom-4 left-0 right-0 text-center z-30">
//                               <Badge variant="secondary" className="animate-pulse bg-black/50 text-white backdrop-blur-md">
//                                 <Loader2 className="w-3 h-3 mr-2 animate-spin" />
//                                 Scanning...
//                               </Badge>
//                             </div>
//                           </>
//                         )}

//                         {!isScanning && !capturedImageUrl && cameraReady && (
//                           <Button onClick={startScanning} className="absolute z-30">
//                             Start Scanning
//                           </Button>
//                         )}

//                         {/* FIX 11: Add retry button on error */}
//                         {cameraError && (
//                           <Button
//                             onClick={() => startCamera(true)}
//                             className="absolute z-30"
//                             variant="destructive"
//                           >
//                             <RefreshCw className="w-4 h-4 mr-2" />
//                             Retry Camera
//                           </Button>
//                         )}
//                       </div>
//                     ) : (
//                       <VerificationResult
//                         imageUrl={capturedImageUrl || ''}
//                         result={recognitionResult}
//                         selectedDoors={selectedDoors}
//                         onToggleDoor={toggleDoorSelection}
//                         onReset={resetAndRestartScan}
//                         onUnlock={handleUnlockDoors}
//                         loading={loading}
//                       />
//                     )}
//                   </TabsContent>
//                 </Tabs>
//               )}
//               <canvas ref={canvasRef} style={{ display: 'none' }} />
//             </DialogContent>
//           </Dialog>

//           {/* ENROLL FACE DIALOG */}
//           <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
//             setIsAddDialogOpen(open);
//             if (!open) resetEnrollForm();
//           }}>
//             <DialogTrigger asChild>
//               <Button>
//                 <Plus className="w-4 h-4 mr-2" />
//                 Enroll Face
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle>Enroll New Face</DialogTitle>
//                 <DialogDescription>
//                   {enrollStep === 'user-select' ? 'Select user and allowed rooms' : 'Capture face image'}
//                 </DialogDescription>
//               </DialogHeader>

//               {enrollStep === 'user-select' ? (
//                 <div className="space-y-4 py-4">
//                   <div className="space-y-2">
//                     <Label>Select User</Label>
//                     <Select value={selectedUser} onValueChange={setSelectedUser}>
//                       <SelectTrigger>
//                         <SelectValue placeholder="Choose a user" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {users.map(user => (
//                           <SelectItem key={user.id} value={user.id}>
//                             <div>
//                               <p className="font-medium">{user.name}</p>
//                               <p className="text-xs text-muted-foreground">{user.email}</p>
//                             </div>
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div className="space-y-2">
//                     <Label>Allowed Rooms</Label>
//                     <div className="border rounded-lg p-4 space-y-2 max-h-[300px] overflow-y-auto">
//                       {rooms.map(room => (
//                         <div
//                           key={room._id}
//                           className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
//                           onClick={() => toggleRoomSelection(room._id)}
//                         >
//                           <div className="flex items-center gap-2">
//                             <Checkbox
//                               checked={selectedRooms.includes(room._id)}
//                               onCheckedChange={() => toggleRoomSelection(room._id)}
//                             />
//                             <MapPin className="w-4 h-4 text-muted-foreground" />
//                             <span>{room.name}</span>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                     <p className="text-xs text-muted-foreground">
//                       {selectedRooms.length} room(s) selected
//                     </p>
//                   </div>

//                   <Button onClick={proceedToCapture} className="w-full" disabled={!selectedUser || selectedRooms.length === 0}>
//                     Continue to Capture
//                     <ArrowRight className="w-4 h-4 ml-2" />
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="space-y-4 py-4">
//                   <Tabs defaultValue="camera" className="w-full">
//                     <TabsList className="grid w-full grid-cols-2">
//                       <TabsTrigger value="camera">Camera</TabsTrigger>
//                       <TabsTrigger value="upload">Upload Image</TabsTrigger>
//                     </TabsList>

//                     <TabsContent value="camera" className="space-y-4">
//                       {!capturedImageUrl ? (
//                         <div className="relative bg-black rounded-lg overflow-hidden h-[300px]">
//                           <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
//                           <Button type="button" onClick={handleManualCapture} className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
//                             <Camera className="w-4 h-4 mr-2" /> Capture
//                           </Button>
//                         </div>
//                       ) : (
//                         <div className="relative">
//                           <img src={capturedImageUrl} alt="Enroll" className="w-full rounded-lg" />
//                           <Button type="button" variant="secondary" size="sm" onClick={resetCapture} className="absolute top-2 right-2">
//                             Retake
//                           </Button>
//                         </div>
//                       )}
//                     </TabsContent>

//                     <TabsContent value="upload" className="space-y-4">
//                       {!capturedImageUrl ? (
//                         <div className="border-2 border-dashed rounded-lg p-12 text-center">
//                           <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
//                           <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="max-w-xs mx-auto" />
//                         </div>
//                       ) : (
//                         <div className="relative">
//                           <img src={capturedImageUrl} alt="Enroll" className="w-full rounded-lg" />
//                           <Button type="button" variant="secondary" size="sm" onClick={resetCapture} className="absolute top-2 right-2">
//                             Change Image
//                           </Button>
//                         </div>
//                       )}
//                     </TabsContent>
//                   </Tabs>

//                   <canvas ref={canvasRef} style={{ display: 'none' }} />
//                   <DialogFooter>
//                     <Button variant="outline" onClick={() => setEnrollStep('user-select')}>Back</Button>
//                     <Button onClick={handleEnrollFace} disabled={loading || !capturedImage}>
//                       {loading ? 'Enrolling...' : 'Enroll Face'}
//                     </Button>
//                   </DialogFooter>
//                 </div>
//               )}
//             </DialogContent>
//           </Dialog>
//         </div>
//       </div>

//       {/* Enrolled Faces List */}
//       <Card>
//         <CardHeader><CardTitle>Enrolled Faces</CardTitle></CardHeader>
//         <CardContent>
//           {faces.length === 0 ? <p className="text-muted-foreground text-center py-8">No faces enrolled</p> : (
//             <div className="space-y-2">
//               {faces.map(face => (
//                 <div key={face.face_id} className="flex justify-between items-center p-3 border rounded">
//                   <div className="flex items-center gap-3">
//                     <div className="bg-primary/10 p-2 rounded-full"><User className="w-4 h-4 text-primary" /></div>
//                     <div><p className="font-medium">{face.name}</p><p className="text-xs text-muted-foreground">{face.email}</p></div>
//                   </div>
//                   <Button variant="ghost" size="sm" onClick={() => setDeleteFaceId(face.face_id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
//                 </div>
//               ))}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       <AlertDialog open={!!deleteFaceId} onOpenChange={() => setDeleteFaceId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader><AlertDialogTitle>Delete Face?</AlertDialogTitle></AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={handleDeleteFace} className="bg-destructive">Delete</AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }

// // Result Component
// function VerificationResult({ imageUrl, result, selectedDoors, onToggleDoor, onReset, onUnlock, loading }: any) {
//   if (!result.matched) {
//     return (
//       <div className="space-y-4">
//         <div className="relative">
//           <img src={imageUrl} alt="Unrecognized" className="w-full rounded-lg border-2 border-red-500" />
//           <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center shadow-lg">
//             <X className="w-4 h-4 mr-1" /> Unrecognized
//           </div>
//         </div>

//         <Card className="border-red-200">
//           <CardContent className="pt-6 space-y-4">
//             <div className="text-center">
//               <h3 className="text-xl font-bold text-red-600">Face Not Recognized</h3>
//               <p className="text-muted-foreground mt-2">{result.message || 'This face is not enrolled in the system.'}</p>
//             </div>

//             <div className="flex gap-3">
//               <Button variant="outline" onClick={onReset} className="flex-1">
//                 <RefreshCw className="w-4 h-4 mr-2" /> Try Again
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   const doorsByRoom = result.available_doors?.reduce((acc: any, door: any) => {
//     const roomName = door.room?.name || 'No Room';
//     if (!acc[roomName]) acc[roomName] = [];
//     acc[roomName].push(door);
//     return acc;
//   }, {});

//   return (
//     <div className="space-y-4">
//       <div className="relative">
//         <img src={imageUrl} alt="Matched" className="w-full rounded-lg border-2 border-green-500" />
//         <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center shadow-lg">
//           <Check className="w-4 h-4 mr-1" /> Matched
//         </div>
//       </div>

//       <Card>
//         <CardContent className="pt-6 space-y-4">
//           <div className="text-center">
//             <h3 className="text-xl font-bold">{result.name}</h3>
//             <p className="text-muted-foreground">{result.email}</p>
//             <Badge variant="outline" className="mt-2">Confidence: {result.confidence}%</Badge>
//           </div>

//           <div className="border-t pt-4">
//             <p className="mb-3 font-medium flex items-center"><DoorOpen className="w-4 h-4 mr-2" /> Available Doors</p>
//             <div className="space-y-3 max-h-[250px] overflow-y-auto">
//               {doorsByRoom && Object.entries(doorsByRoom).map(([roomName, doors]: [string, any]) => (
//                 <div key={roomName} className="space-y-2">
//                   <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
//                     <MapPin className="w-3 h-3" />
//                     {roomName}
//                   </div>
//                   {doors.map((door: any) => (
//                     <div key={door._id} className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer ml-4" onClick={() => onToggleDoor(door._id)}>
//                       <div className="flex items-center space-x-2">
//                         <Checkbox checked={selectedDoors.includes(door._id)} onCheckedChange={() => onToggleDoor(door._id)} />
//                         <span className="text-sm font-medium">{door.name}</span>
//                       </div>
//                       {door.is_locked ? <Lock className="w-3 h-3 text-red-500" /> : <DoorOpen className="w-3 h-3 text-green-500" />}
//                     </div>
//                   ))}
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="flex gap-3">
//             <Button variant="outline" onClick={onReset} className="flex-1">
//               <RefreshCw className="w-4 h-4 mr-2" /> Scan Again
//             </Button>
//             <Button onClick={onUnlock} className="flex-1" disabled={loading || selectedDoors.length === 0}>
//               {loading ? 'Unlocking...' : `Unlock ${selectedDoors.length} Door(s)`}
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }