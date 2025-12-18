'use client';

import { useState, useEffect, useRef } from 'react';
import { faceAPI, deviceAPI, roomAPI, authAPI, userAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Camera, Plus, Trash2, User, Check, X, Lock, Upload, DoorOpen, MapPin, Loader2, RefreshCw, ArrowRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDevices } from '@/hooks/useDevices';
import { toast } from 'sonner';

interface Face {
  face_id: string;
  user_id?: string;
  name: string;
  email: string;
  created_at: string;
  recognition_count: number;
  last_recognized: string | null;
  allowed_rooms: string[];
  image_path?: string;
}

interface DoorLock {
  _id: string;
  name: string;
  status: string;
  is_locked: boolean;
  room_id: string | null;
  device_type: string;
}

interface Room {
  _id: string;
  name: string;
  description?: string;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

interface RecognitionResult {
  matched: boolean;
  user_id?: string;
  name?: string;
  email?: string;
  confidence?: number;
  distance?: number;
  available_doors?: DoorLock[];
  total_doors?: number;
  recognition_count?: number;
  message?: string;
}

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  checks: {
    hasMovement: boolean;
    isSharp: boolean;
    isWellLit: boolean;
    hasFace: boolean;
  };
  message: string;
}

export default function FaceRecognitionPage() {
  const { user } = useAuthStore();
  const { devices, fetchDevices } = useDevices();
  const [doorScans, setDoorScans] = useState<DoorLock[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [editFace, setEditFace] = useState<Face | null>(null);
  const [viewImageFace, setViewImageFace] = useState<Face | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewImageDialogOpen, setIsViewImageDialogOpen] = useState(false);

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRecognizeDialogOpen, setIsRecognizeDialogOpen] = useState(false);
  const [deleteFaceId, setDeleteFaceId] = useState<string | null>(null);

  // Step States
  const [verifyStep, setVerifyStep] = useState<'room-select' | 'scanning'>('room-select');
  const [enrollStep, setEnrollStep] = useState<'user-select' | 'capture'>('user-select');

  // Data States
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedVerifyRoom, setSelectedVerifyRoom] = useState<string>('');

  // Capture States
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [selectedDoors, setSelectedDoors] = useState<string[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScanningRef = useRef(false);
  // Liveness Detection States
  const [isCheckingLiveness, setIsCheckingLiveness] = useState(false);
  const [livenessResult, setLivenessResult] = useState<LivenessResult>(null);
  const [previousFrames, setPreviousFrames] = useState([]);

  useEffect(() => {
    fetchFaces();
    fetchUsers();
    fetchDoorScans();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (devices.length > 0) {
      const scans = devices.filter(d => d.device_type === "door_lock" && d.state.is_face_scan);
      setDoorScans(scans);
    }
  }, [devices]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isRecognizeDialogOpen && verifyStep === 'scanning') {
      timer = setTimeout(() => startCamera(true), 100);
    } else if (isAddDialogOpen && enrollStep === 'capture') {
      timer = setTimeout(() => startCamera(false), 100);
    } else if (isEditDialogOpen) {
      timer = setTimeout(() => startCamera(false), 100);
    } else {
      stopCamera();
      stopScanning();
    }

    return () => {
      clearTimeout(timer);
      stopCamera();
      stopScanning();
    };
  }, [isRecognizeDialogOpen, isAddDialogOpen, isEditDialogOpen, verifyStep, enrollStep]);

  const handleEditFace = async () => {
    if (!editFace || (!capturedImage) || selectedRooms.length === 0) {
      alert('Please make changes before saving');
      return;
    }

    // Validate at least one door scan is selected
    // if (selectedRooms.length === 0) {
    //   alert('Please select at least one door scan');
    //   return;
    // }

    setLoading(true);
    try {
      const formData = new FormData();
      if (capturedImage) {
        formData.append('image', capturedImage, 'face.jpg');
      }
      // if (selectedRooms.length > 0) {
      formData.append('allowed_rooms', JSON.stringify(selectedRooms));
      // }

      await faceAPI.updateFace(editFace.face_id, formData);
      await fetchFaces();
      setIsEditDialogOpen(false);
      setEditFace(null);
      resetCapture();
      setSelectedRooms([]);
      alert('✅ Face updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update face');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = async (face: Face) => {
    setEditFace(face);
    try {
      setSelectedRooms(face.allowed_rooms);
    } catch (error) {
      console.error('Error fetching face details:', error);
      setSelectedRooms([]);
    }
    setIsEditDialogOpen(true);
  };

  const fetchFaces = async () => {
    try {
      const response = await faceAPI.getUserFaces()
      setFaces(response.data.data);
    } catch (error) {
      console.error('Error fetching faces:', error);
    }
  };


  const fetchRooms = async () => {
    try {
      const response = await roomAPI.getAll();
      setRooms(response.data.data || []);
    } catch (error) {
      console.error('Error fetching door scans:', error);
    }
  };
  const fetchDoorScans = async () => {
    try {
      await fetchDevices();
      const scans = devices.filter(d => d.device_type === "door_lock" && d.state.is_face_scan);
      setDoorScans(scans);
    } catch (error) {
      console.error('Error fetching door scans:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // CLIENT-SIDE LIVENESS DETECTION
  const performClientSideLivenessCheck = async (imageBlob) : Promise<LivenessResult> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (!imageData) {
          resolve({
            isLive: false,
            confidence: 0,
            checks: { hasMovement: false, isSharp: false, isWellLit: false, hasFace: false },
            message: 'Failed to analyze image'
          });
          return;
        }

        const isSharp = checkSharpness(imageData);
        const isWellLit = checkLighting(imageData);
        const hasMovement = checkMovement(imageData);
        const hasFace = checkForFace(imageData);

        const checksArray = [hasMovement, isSharp, isWellLit, hasFace];
        const passedChecks = checksArray.filter(Boolean).length;
        const confidence = (passedChecks / checksArray.length) * 100;
        const isLive = passedChecks >= 3;

        resolve({
          isLive,
          confidence,
          checks: { hasMovement, isSharp, isWellLit, hasFace },
          message: isLive ? 'Live person detected' : 'Possible spoofing detected'
        });

        setPreviousFrames(prev => [...prev.slice(-4), imageData]);
      };

      img.src = URL.createObjectURL(imageBlob);
    });
  };

  const checkSharpness = (imageData) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let laplacianSum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const neighbors = [
          0.299 * data[((y - 1) * width + x) * 4] + 0.587 * data[((y - 1) * width + x) * 4 + 1] + 0.114 * data[((y - 1) * width + x) * 4 + 2],
          0.299 * data[((y + 1) * width + x) * 4] + 0.587 * data[((y + 1) * width + x) * 4 + 1] + 0.114 * data[((y + 1) * width + x) * 4 + 2],
          0.299 * data[(y * width + x - 1) * 4] + 0.587 * data[(y * width + x - 1) * 4 + 1] + 0.114 * data[(y * width + x - 1) * 4 + 2],
          0.299 * data[(y * width + x + 1) * 4] + 0.587 * data[(y * width + x + 1) * 4 + 1] + 0.114 * data[(y * width + x + 1) * 4 + 2]
        ];
        const laplacian = Math.abs(4 * gray - neighbors.reduce((a, b) => a + b, 0));
        laplacianSum += laplacian * laplacian;
        count++;
      }
    }
    const variance = laplacianSum / count;
    return variance > 100;
  };

  const checkLighting = (imageData) => {
    const data = imageData.data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += brightness;
    }
    const avgBrightness = sum / (data.length / 4);
    return avgBrightness > 40 && avgBrightness < 220;
  };

  const checkMovement = (imageData) => {
    if (previousFrames.length < 2) return true;
    const currentData = imageData.data;
    const previousData = previousFrames[previousFrames.length - 1].data;
    let differenceSum = 0;
    let count = 0;
    for (let i = 0; i < currentData.length; i += 40) {
      const currentBrightness = 0.299 * currentData[i] + 0.587 * currentData[i + 1] + 0.114 * currentData[i + 2];
      const previousBrightness = 0.299 * previousData[i] + 0.587 * previousData[i + 1] + 0.114 * previousData[i + 2];
      differenceSum += Math.abs(currentBrightness - previousBrightness);
      count++;
    }
    const avgDifference = differenceSum / count;
    return avgDifference > 2 && avgDifference < 50;
  };

  const checkForFace = (imageData) => {
    const data = imageData.data;
    let skinPixels = 0;
    let totalPixels = 0;
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const isSkin = (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && Math.max(r, g, b) - Math.min(r, g, b) > 15);
      if (isSkin) skinPixels++;
      totalPixels++;
    }
    const skinRatio = skinPixels / totalPixels;
    return skinRatio > 0.1 && skinRatio < 0.6;
  };

  const startCamera = async (autoScan: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        if (autoScan) {
          setTimeout(() => startScanning(), 1000);
        }
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);

      let errorMessage = 'Failed to access camera. ';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Camera permission was denied. Please allow camera access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += 'Please check your camera settings and try again.';
      }

      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setPreviousFrames([]); // ADD THIS LINE
  };

  const startScanning = () => {
    if (isScanningRef.current) return;

    setIsScanning(true);
    isScanningRef.current = true;
    setRecognitionResult(null);

    scanLoop();
  };

  const stopScanning = () => {
    setIsScanning(false);
    isScanningRef.current = false;
  };

  const scanLoop = async () => {
    if (!isScanningRef.current || !videoRef.current) return;

    const blob = await captureFrameToBlob();

    if (blob) {
      try {
        // ADD: Liveness check first
        setIsCheckingLiveness(true);
        const livenessCheck = await performClientSideLivenessCheck(blob);
        setIsCheckingLiveness(false);
        setLivenessResult(livenessCheck);

        if (!livenessCheck.isLive) {
          console.log(`⚠️ Liveness check failed (${livenessCheck.confidence.toFixed(1)}% confidence)`);
          if (isScanningRef.current) {
            setTimeout(scanLoop, 1000);
          }
          return;
        }

        console.log(`✅ Liveness check passed (${livenessCheck.confidence.toFixed(1)}% confidence)`);
        // END ADD

        const formData = new FormData()
        formData.append('image', blob, 'scan.jpg');
        if (selectedVerifyRoom) formData.append('room_id', selectedVerifyRoom);
        const token = localStorage.getItem('token');
        if (token) formData.append('auth_token', token);

        const response = await faceAPI.verify(formData);
        const result = response.data.data;

        if (result.matched) {
          stopScanning();

          setRecognitionResult(result);
          setCapturedImageUrl(URL.createObjectURL(blob));

          // Auto-select and control the first available door
          if (result.allowed_rooms && result.allowed_rooms.length > 0) {
            const firstDoor = devices.find(d => d._id === result.allowed_rooms[0]);
            const firstDoorId = firstDoor._id;
            setSelectedDoors([firstDoorId]);

            // Show loading state
            setLoading(true);

            // Automatically control the door based on its current state
            setTimeout(async () => {
              try {
                console.log("JSON", JSON.stringify(firstDoor));

                const action = firstDoor?.state?.is_locked == true ? 'unlock' : 'lock';

                console.log(`🔐 Attempting to ${action} door: ${firstDoor?.name}`);

                await deviceAPI.control(firstDoorId, action);

                console.log(`✅ Door ${action}ed successfully!`);
                toast.success(`Door ${action}ed successfully!`);
                await fetchDoorScans()

                // Update the result with the new door state
                setRecognitionResult(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    available_doors: prev.available_doors?.map(door =>
                      door._id === firstDoorId
                        ? { ...door, is_locked: !door.is_locked }
                        : door
                    )
                  };
                });

                // Close dialog after showing success message
                setTimeout(() => {
                  setIsRecognizeDialogOpen(false);
                  resetVerifyDialog();
                }, 3000); // Changed from 2000 to 3000 to give more time to see the result
              } catch (error) {
                console.error('❌ Auto door control failed:', error);
                alert('Failed to control door automatically');
              } finally {
                setLoading(false);
              }
            }, 500);
          }
          return;
        }
      } catch (error: any) {
        if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
          stopScanning();
          setRecognitionResult({ matched: false, message: 'Face not recognized. Please try again or enroll your face first.' });
          setCapturedImageUrl(URL.createObjectURL(blob));

          setTimeout(() => {
            resetAndRestartScan();
          }, 3000);
          return;
        }
        console.log("Scanning...");
      }
    }

    if (isScanningRef.current) {
      setTimeout(scanLoop, 1000);
    }
  };

  const captureFrameToBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0);
          canvasRef.current.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  };

  const handleManualCapture = async () => {
    const blob = await captureFrameToBlob();
    if (blob) {
      setIsCheckingLiveness(true);
      toast.info('Checking for live person...');

      const livenessCheck = await performClientSideLivenessCheck(blob);
      setIsCheckingLiveness(false);
      setLivenessResult(livenessCheck);

      if (livenessCheck.isLive) {
        setCapturedImage(blob);
        setCapturedImageUrl(URL.createObjectURL(blob));
        stopScanning();
        toast.success(`Live person detected! (${livenessCheck.confidence.toFixed(1)}% confidence)`);
      } else {
        toast.error(`Spoofing detected! (${livenessCheck.confidence.toFixed(1)}% confidence)`);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsCheckingLiveness(true);
      toast.info('Checking for live person...');

      const livenessCheck = await performClientSideLivenessCheck(file);
      setIsCheckingLiveness(false);
      setLivenessResult(livenessCheck);

      if (livenessCheck.isLive) {
        setCapturedImage(file);
        setCapturedImageUrl(URL.createObjectURL(file));
        stopScanning();
        stopCamera();
        toast.success(`Live person detected! (${livenessCheck.confidence.toFixed(1)}% confidence)`);
      } else {
        toast.error(`Spoofing detected! (${livenessCheck.confidence.toFixed(1)}% confidence)`);
        event.target.value = '';
      }
    }
  };

  const handleEnrollFace = async () => {
    if (!capturedImage || !selectedUser || selectedRooms.length === 0) {
      alert('Please select a user, capture an image, and select at least one door');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_id', selectedUser);
      formData.append('image', capturedImage, 'face.jpg');
      formData.append('allowed_rooms', JSON.stringify(selectedRooms));

      await faceAPI.enroll(formData);
      await fetchFaces();
      setIsAddDialogOpen(false);
      resetEnrollForm();
      alert('✅ Face enrolled successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to enroll face');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockDoors = async () => {
    if (selectedDoors.length === 0) return;
    setLoading(true);
    try {
      // Get the door's current state and toggle it
      const door = recognitionResult?.available_doors?.find((d: DoorLock) => d._id === selectedDoors[0]);
      const action = door?.is_locked ? 'unlock' : 'lock';

      await deviceAPI.control(selectedDoors[0], action);
      alert(`✅ Door ${action}ed successfully!`);
      setIsRecognizeDialogOpen(false);
      resetVerifyDialog();
    } catch (error: any) {
      alert('Failed to control door');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFace = async () => {
    if (!deleteFaceId) return;
    try {
      await faceAPI.deleteFace(deleteFaceId);
      await fetchFaces();
      setDeleteFaceId(null);
    } catch (error) {
      alert('Failed to delete face');
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCapturedImageUrl(null);
    setRecognitionResult(null);
    setSelectedDoors([]);
    setLivenessResult(null);      // ADD
    setPreviousFrames([]);         // ADD
    stopScanning();
  };

  const resetAndRestartScan = () => {
    resetCapture();
    startCamera(true);
  };

  const resetVerifyDialog = () => {
    setVerifyStep('room-select');
    setSelectedVerifyRoom('');
    resetCapture();
  };

  const resetEnrollForm = () => {
    setEnrollStep('user-select');
    setSelectedUser('');
    setSelectedRooms([]);
    resetCapture();
  };

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRooms(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const toggleDoorSelection = (doorId: string) => {
    setSelectedDoors(prev =>
      prev.includes(doorId) ? prev.filter(id => id !== doorId) : [...prev, doorId]
    );
  };

  const proceedToScanning = () => {
    if (!selectedVerifyRoom) {
      alert('Please select a room first');
      return;
    }
    setVerifyStep('scanning');
  };

  const proceedToCapture = () => {
    if (!selectedUser || selectedRooms.length === 0) {
      alert('Please select a user and at least one room');
      return;
    }
    setEnrollStep('capture');
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Face Recognition</h1>
          <p className="text-muted-foreground">AI-powered facial recognition for door access</p>
        </div>
        <div className="flex space-x-2">

          {/* VERIFY FACE DIALOG */}
          <Dialog open={isRecognizeDialogOpen} onOpenChange={(open) => {
            setIsRecognizeDialogOpen(open);
            if (!open) { resetVerifyDialog(); }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                Verify Face
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Face Verification</DialogTitle>
                <DialogDescription>
                  {verifyStep === 'room-select' ? 'Select a room to verify access' : isScanning ? 'Position your face in the camera' : 'Verification complete'}
                </DialogDescription>
              </DialogHeader>

              {verifyStep === 'room-select' ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Door Scan</Label>
                    <Select value={selectedVerifyRoom} onValueChange={setSelectedVerifyRoom}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a door scan to verify access" />
                      </SelectTrigger>
                      <SelectContent>
                        {doorScans.map(door => (
                          <SelectItem key={door._id} value={door._id}>
                            <div className="flex items-center gap-2">
                              <DoorOpen className="w-4 h-4" />
                              {door.name}
                              {
                                rooms.find(r => r._id === door?.room_id)?.name && (
                                  <span className="text-xs text-muted-foreground">({rooms.find(r => r._id === door?.room_id)?.name})</span>
                                )
                              }
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={proceedToScanning} className="w-full" disabled={!selectedVerifyRoom}>
                    Continue to Scan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="camera" className="w-full">
                  <TabsContent value="camera" className="space-y-4">
                    {!recognitionResult ? (
                      <div className="relative bg-black rounded-lg overflow-hidden min-h-[400px] flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {isScanning && (
                          <>
                            <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none z-10"></div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-scan z-20 opacity-80"></div>
                            <div className="absolute bottom-4 left-0 right-0 text-center z-30">
                              <Badge variant="secondary" className="animate-pulse bg-black/50 text-white backdrop-blur-md">
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Scanning...
                              </Badge>
                            </div>
                          </>
                        )}

                        {!isScanning && !capturedImageUrl && (
                          <Button onClick={() => startScanning()} className="absolute z-30">
                            Start Scanning
                          </Button>
                        )}
                      </div>
                    ) : (
                      <VerificationResult
                        imageUrl={capturedImageUrl || ''}
                        result={recognitionResult}
                        selectedDoors={selectedDoors}
                        onToggleDoor={toggleDoorSelection}
                        onReset={resetAndRestartScan}
                        onUnlock={handleUnlockDoors}
                        loading={loading}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </DialogContent>
          </Dialog>

          {/* ENROLL FACE DIALOG */}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetEnrollForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Enroll Face
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enroll New Face</DialogTitle>
                <DialogDescription>
                  {enrollStep === 'user-select' ? 'Select user and allowed doors scan' : 'Capture face image'}
                </DialogDescription>
              </DialogHeader>

              {enrollStep === 'user-select' ? (
                <div className="space-y-4 py-4">

                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map(user => (
                          <SelectItem key={user._id} value={user._id}>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Door Scans</Label>
                    <div className="border rounded-lg p-4 space-y-2 max-h-[300px] overflow-y-auto">
                      {doorScans.map(door => (
                        <div
                          key={door._id}
                          className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                          onClick={() => toggleRoomSelection(door._id)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedRooms.includes(door._id)}
                              onCheckedChange={() => toggleRoomSelection(door._id)}
                            />
                            <DoorOpen className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <span>{door.name}</span>
                              {
                                door?.room_id && (
                                  <span className="text-xs text-muted-foreground">({rooms.find(r => r._id === door?.room_id)?.name})</span>
                                )
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedRooms.length} door scan(s) selected
                    </p>
                  </div>

                  {/* <div className="space-y-2">
                      <Label>Allowed Doors Scan</Label>
                      <div className="border rounded-lg p-4 space-y-2 max-h-[300px] overflow-y-auto">
                        {rooms.map(room => (
                          <div
                            key={room._id}
                            className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                            onClick={() => toggleRoomSelection(room._id)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedRooms.includes(room._id)}
                                onCheckedChange={() => toggleRoomSelection(room._id)}
                              />
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span>{room.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedRooms.length} room(s) selected
                      </p>
                    </div> */}

                  <Button onClick={proceedToCapture} className="w-full" disabled={!selectedUser || selectedRooms.length === 0}>
                    Continue to Capture
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <Tabs defaultValue="camera" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="camera">Camera</TabsTrigger>
                      <TabsTrigger value="upload">Upload Image</TabsTrigger>
                    </TabsList>

                    <TabsContent value="camera" className="space-y-4">
                      {!capturedImageUrl ? (
                        <div className="relative bg-black rounded-lg overflow-hidden h-[300px]">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <Button type="button" onClick={handleManualCapture} className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                            <Camera className="w-4 h-4 mr-2" /> Capture
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <img src={capturedImageUrl} alt="Enroll" className="w-full rounded-lg" />
                          <Button type="button" variant="secondary" size="sm" onClick={resetCapture} className="absolute top-2 right-2">
                            Retake
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4">
                      {!capturedImageUrl ? (
                        <div className="border-2 border-dashed rounded-lg p-12 text-center">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                        </div>
                      ) : (
                        <div className="relative">
                          <img src={capturedImageUrl} alt="Enroll" className="w-full rounded-lg" />
                          <Button type="button" variant="secondary" size="sm" onClick={resetCapture} className="absolute top-2 right-2">
                            Change Image
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEnrollStep('user-select')}>Back</Button>
                    <Button onClick={handleEnrollFace} disabled={loading || !capturedImage}>
                      {loading ? 'Enrolling...' : 'Enroll Face'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enrolled Faces List */}
      {/* {JSON.stringify(users, null ,2)} */}
      <Card>
        <CardHeader><CardTitle>Enrolled Faces</CardTitle></CardHeader>
        <CardContent>
          {faces.length === 0 ? <p className="text-muted-foreground text-center py-8">No faces enrolled</p> : (
            <div className="space-y-2">
              {faces.map(face => (
                <div key={face.face_id} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{users.find(user => user._id === face.user_id)?.name}</p>
                      <p className="text-xs text-muted-foreground">{users.find(user => user._id === face.user_id)?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setViewImageFace(face);
                      setIsViewImageDialogOpen(true);
                    }}>
                      <Camera className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(face)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteFaceId(face.face_id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteFaceId} onOpenChange={() => setDeleteFaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Face?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFace} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* EDIT FACE DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditFace(null);
          resetCapture();
          setSelectedRooms([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Face - {users.find(user => user._id === editFace?.user_id)?.name}</DialogTitle>
            <DialogDescription>Update face image or allowed doors scan</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Tabs defaultValue="image" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image">Update Image</TabsTrigger>
                <TabsTrigger value="rooms">Allowed Door Scans</TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-4">
                <Tabs defaultValue="camera" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="camera">Camera</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                  </TabsList>

                  <TabsContent value="camera" className="space-y-4">
                    {!capturedImageUrl ? (
                      <div className="relative bg-black rounded-lg overflow-hidden h-[300px]">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <Button type="button" onClick={handleManualCapture} className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                          <Camera className="w-4 h-4 mr-2" /> Capture
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={capturedImageUrl} alt="Updated" className="w-full rounded-lg" />
                        <Button type="button" variant="secondary" size="sm" onClick={resetCapture} className="absolute top-2 right-2">
                          Retake
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    {!capturedImageUrl ? (
                      <div className="border-2 border-dashed rounded-lg p-12 text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <Input type="file" accept="image/*" onChange={handleFileUpload} className="max-w-xs mx-auto" />
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={capturedImageUrl} alt="Updated" className="w-full rounded-lg" />
                        <Button type="button" variant="secondary" size="sm" onClick={resetCapture} className="absolute top-2 right-2">
                          Change
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="rooms" className="space-y-4">
                <div className="border rounded-lg p-4 space-y-2 max-h-[400px] overflow-y-auto">
                  {doorScans.map(door => (
                    <div
                      key={door._id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                      onClick={() => toggleRoomSelection(door._id)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedRooms.includes(door._id)}
                          onCheckedChange={() => toggleRoomSelection(door._id)}
                        />
                        <DoorOpen className="w-4 h-4 text-muted-foreground" />
                        <div>
                          {/* {JSON.stringify(door, null, 2)}
                            {JSON.stringify(rooms, null, 2)} */}
                          <span>{door.name}</span>
                          {
                            door?.room_id && (
                              <span className="text-xs text-muted-foreground">({rooms.find(r => r._id === door?.room_id)?.name})</span>
                            )
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {/* {selectedRooms.length} door scan(s) selectedd */}
                </p>
              </TabsContent>
            </Tabs>

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditFace} disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW IMAGE DIALOG */}
      <Dialog open={isViewImageDialogOpen} onOpenChange={setIsViewImageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{users.find(u => u._id === viewImageFace?.user_id)?.name}</DialogTitle>
            <DialogDescription>{users.find(u => u._id === viewImageFace?.user_id)?.email}</DialogDescription>
          </DialogHeader>
          {viewImageFace && (
            <div className="py-4" style={{ width: "100%", maxHeight: "500px", overflow: "auto" }}>
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${viewImageFace?.image_path}`}
                alt={viewImageFace.name}
                className="w-full rounded-lg"
                crossOrigin='anonymous'
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Result Component
function VerificationResult({ imageUrl, result, selectedDoors, onToggleDoor, onReset, onUnlock, loading }: any) {
  if (!result.matched) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <img src={imageUrl} alt="Unrecognized" className="w-full rounded-lg border-2 border-red-500" />
          <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center shadow-lg">
            <X className="w-4 h-4 mr-1" /> Unrecognized
          </div>
        </div>

        <Card className="border-red-200">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-red-600">Face Not Recognized</h3>
              <p className="text-muted-foreground mt-2">{result.message || 'This face is not enrolled in the system.'}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onReset} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const doorsByRoom = result.available_doors?.reduce((acc: any, door: any) => {
    const roomName = door.room?.name || 'No Room';
    if (!acc[roomName]) acc[roomName] = [];
    acc[roomName].push(door);
    return acc;
  }, {});

  // Get the selected door for display
  const selectedDoor = result.available_doors?.find((d: any) => d._id === selectedDoors[0]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <img src={imageUrl} alt="Matched" className="w-full rounded-lg border-2 border-green-500" />
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center shadow-lg">
          <Check className="w-4 h-4 mr-1" /> Matched
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold">{result.name}</h3>
            <p className="text-muted-foreground">{result.email}</p>
            <Badge variant="outline" className="mt-2">Confidence: {result.confidence}%</Badge>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 font-medium flex items-center"><DoorOpen className="w-4 h-4 mr-2" /> Door Access</p>
            {selectedDoor && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {selectedDoor.room?.name || 'No Room'}
                </div>
                <div className="flex items-center justify-between p-3 border-2 border-green-500 rounded bg-green-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{selectedDoor.name}</span>
                    <Badge variant={selectedDoor.is_locked ? "destructive" : "default"}>
                      {selectedDoor.is_locked ? "Locked" : "Unlocked"}
                    </Badge>
                  </div>
                  {selectedDoor.is_locked ? <Lock className="w-4 h-4 text-red-500" /> : <DoorOpen className="w-4 h-4 text-green-500" />}
                </div>
              </div>
            )}
          </div>

          <div className={`border rounded-lg p-4 text-center ${loading ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
            {loading ? (
              <>
                <div className="flex items-center justify-center gap-2 text-blue-700 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Controlling door...
                </div>
                <p className="text-sm text-blue-600 mt-1">Please wait...</p>
              </>
            ) : (
              <>
                <p className="text-green-700 font-medium">✓ Door action completed automatically</p>
                <p className="text-sm text-green-600 mt-1">This dialog will close in a moment...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}