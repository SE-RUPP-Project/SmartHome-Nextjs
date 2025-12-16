'use client';

import { useState, useEffect, useRef } from 'react';
import { faceAPI, deviceAPI, roomAPI, authAPI, userAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Camera, Plus, Trash2, User, Check, X, Lock, Upload, DoorOpen, MapPin, Loader2, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
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
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedVerifyRoom, setSelectedVerifyRoom] = useState('');

  // Capture States
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [selectedDoors, setSelectedDoors] = useState<string[]>([]);

  // Liveness Detection States
  const [isCheckingLiveness, setIsCheckingLiveness] = useState(false);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [previousFrames, setPreviousFrames] = useState<ImageData[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScanningRef = useRef(false);

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

  // CLIENT-SIDE LIVENESS DETECTION
  const performClientSideLivenessCheck = async (imageBlob: Blob): Promise<LivenessResult> => {
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

        // Check 1: Sharpness (Laplacian variance)
        const isSharp = checkSharpness(imageData);

        // Check 2: Lighting
        const isWellLit = checkLighting(imageData);

        // Check 3: Movement detection (compare with previous frames)
        const hasMovement = checkMovement(imageData);

        // Check 4: Basic face detection (check for skin tones)
        const hasFace = checkForFace(imageData);

        // Calculate confidence
        const checksArray = [hasMovement, isSharp, isWellLit, hasFace];
        const passedChecks = checksArray.filter(Boolean).length;
        const confidence = (passedChecks / checksArray.length) * 100;

        const isLive = passedChecks >= 3; // At least 3 out of 4 checks must pass

        resolve({
          isLive,
          confidence,
          checks: { hasMovement, isSharp, isWellLit, hasFace },
          message: isLive ? 'Live person detected' : 'Possible spoofing detected'
        });

        // Store frame for movement detection
        setPreviousFrames(prev => [...prev.slice(-4), imageData]);
      };

      img.src = URL.createObjectURL(imageBlob);
    });
  };

  const checkSharpness = (imageData: ImageData): boolean => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale and calculate Laplacian
    let laplacianSum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        // Simple Laplacian kernel
        const neighbors = [
          0.299 * data[((y-1) * width + x) * 4] + 0.587 * data[((y-1) * width + x) * 4 + 1] + 0.114 * data[((y-1) * width + x) * 4 + 2],
          0.299 * data[((y+1) * width + x) * 4] + 0.587 * data[((y+1) * width + x) * 4 + 1] + 0.114 * data[((y+1) * width + x) * 4 + 2],
          0.299 * data[(y * width + x - 1) * 4] + 0.587 * data[(y * width + x - 1) * 4 + 1] + 0.114 * data[(y * width + x - 1) * 4 + 2],
          0.299 * data[(y * width + x + 1) * 4] + 0.587 * data[(y * width + x + 1) * 4 + 1] + 0.114 * data[(y * width + x + 1) * 4 + 2]
        ];

        const laplacian = Math.abs(4 * gray - neighbors.reduce((a, b) => a + b, 0));
        laplacianSum += laplacian * laplacian;
        count++;
      }
    }

    const variance = laplacianSum / count;
    return variance > 100; // Threshold for sharpness
  };

  const checkLighting = (imageData: ImageData): boolean => {
    const data = imageData.data;
    let sum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += brightness;
    }

    const avgBrightness = sum / (data.length / 4);
    return avgBrightness > 40 && avgBrightness < 220;
  };

  const checkMovement = (imageData: ImageData): boolean => {
    if (previousFrames.length < 2) return true; // Not enough frames yet

    const currentData = imageData.data;
    const previousData = previousFrames[previousFrames.length - 1].data;

    let differenceSum = 0;
    let count = 0;

    for (let i = 0; i < currentData.length; i += 40) { // Sample every 10th pixel
      const currentBrightness = 0.299 * currentData[i] + 0.587 * currentData[i + 1] + 0.114 * currentData[i + 2];
      const previousBrightness = 0.299 * previousData[i] + 0.587 * previousData[i + 1] + 0.114 * previousData[i + 2];
      differenceSum += Math.abs(currentBrightness - previousBrightness);
      count++;
    }

    const avgDifference = differenceSum / count;
    // Some movement is expected (2-30), but too much means video replay
    return avgDifference > 2 && avgDifference < 50;
  };

  const checkForFace = (imageData: ImageData): boolean => {
    const data = imageData.data;
    let skinPixels = 0;
    let totalPixels = 0;

    // Simple skin tone detection (YCbCr color space approximation)
    for (let i = 0; i < data.length; i += 40) { // Sample pixels
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Simplified skin tone detection
      const isSkin = (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15
      );

      if (isSkin) skinPixels++;
      totalPixels++;
    }

    const skinRatio = skinPixels / totalPixels;
    return skinRatio > 0.1 && skinRatio < 0.6; // Face should have some skin tone pixels
  };

  const handleEditFace = async () => {
    if (!editFace || (!capturedImage) || selectedRooms.length === 0) {
      alert('Please make changes before saving');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (capturedImage) {
        formData.append('image', capturedImage, 'face.jpg');
      }
      formData.append('allowed_rooms', JSON.stringify(selectedRooms));

      await faceAPI.updateFace(editFace.face_id, formData);
      await fetchFaces();
      setIsEditDialogOpen(false);
      setEditFace(null);
      resetCapture();
      setSelectedRooms([]);
      toast.success('Face updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update face');
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
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setPreviousFrames([]); // Reset frames when camera stops
  };

  const startScanning = () => {
    if (isScanningRef.current) return;
    setIsScanning(true);
    isScanningRef.current = true;
    setRecognitionResult(null);
    setLivenessResult(null);
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
        // First, perform client-side liveness check
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

        // If live, proceed with face verification
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

            setLoading(true);

            setTimeout(async () => {
              try {
                const action = firstDoor?.state?.is_locked == true ? 'unlock' : 'lock';
                console.log(`🔐 Attempting to ${action} door: ${firstDoor?.name}`);

                await deviceAPI.control(firstDoorId, action);
                console.log(`✅ Door ${action}ed successfully!`);
                toast.success(`Door ${action}ed successfully!`);
                await fetchDoorScans()

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

                setTimeout(() => {
                  setIsRecognizeDialogOpen(false);
                  resetVerifyDialog();
                }, 3000);

              } catch (error) {
                console.error('❌ Auto door control failed:', error);
                toast.error('Failed to control door automatically');
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
          setRecognitionResult({
            matched: false,
            message: 'Face not recognized. Please try again or enroll your face first.'
          });
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
        toast.error(`Spoofing detected! (${livenessCheck.confidence.toFixed(1)}% confidence) - ${livenessCheck.message}`);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        toast.error(`Spoofing detected! (${livenessCheck.confidence.toFixed(1)}% confidence) - ${livenessCheck.message}`);
        event.target.value = '';
      }
    }
  };

  const handleEnrollFace = async () => {
    if (!capturedImage || !selectedUser || selectedRooms.length === 0) {
      toast.error('Please select a user, capture an image, and select at least one door');
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
      toast.success('Face enrolled successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to enroll face');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockDoors = async () => {
    if (selectedDoors.length === 0) return;

    setLoading(true);
    try {
      const door = recognitionResult?.available_doors?.find((d: DoorLock) => d._id === selectedDoors[0]);
      const action = door?.is_locked ? 'unlock' : 'lock';

      await deviceAPI.control(selectedDoors[0], action);
      toast.success(`Door ${action}ed successfully!`);
      setIsRecognizeDialogOpen(false);
      resetVerifyDialog();
    } catch (error: any) {
      toast.error('Failed to control door');
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
      toast.success('Face deleted successfully');
    } catch (error) {
      toast.error('Failed to delete face');
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCapturedImageUrl(null);
    setRecognitionResult(null);
    setSelectedDoors([]);
    setLivenessResult(null);
    setPreviousFrames([]);
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
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const toggleDoorSelection = (doorId: string) => {
    setSelectedDoors(prev =>
      prev.includes(doorId)
        ? prev.filter(id => id !== doorId)
        : [...prev, doorId]
    );
  };

  const proceedToScanning = () => {
    if (!selectedVerifyRoom) {
      toast.error('Please select a room first');
      return;
    }
    setVerifyStep('scanning');
  };

  const proceedToCapture = () => {
    if (!selectedUser || selectedRooms.length === 0) {
      toast.error('Please select a user and at least one room');
      return;
    }
    setEnrollStep('capture');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Face Recognition
          </CardTitle>
          <CardDescription>AI-powered facial recognition for door access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Dialog open={isRecognizeDialogOpen} onOpenChange={(open) => {
              setIsRecognizeDialogOpen(open);
              if (!open) {
                resetVerifyDialog();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Camera className="w-4 h-4 mr-2" />
                  Verify Face
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Face Verification</DialogTitle>
                  <DialogDescription>
                    {verifyStep === 'room-select'
                      ? 'Select a room to verify access'
                      : isScanning
                        ? 'Position your face in the camera'
                        : 'Verification complete'}
                  </DialogDescription>
                </DialogHeader>

                {verifyStep === 'room-select' ? (
                  <div className="space-y-4">
                    <Label>Select Door Scan</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {doorScans.map(door => (
                        <div
                          key={door._id}
                          onClick={() => setSelectedVerifyRoom(door._id)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedVerifyRoom === door._id
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <DoorOpen className="w-4 h-4" />
                            {door.name}
                            {rooms.find(r => r._id === door?.room_id)?.name && (
                              <span className="text-sm text-muted-foreground">
                                ({rooms.find(r => r._id === door?.room_id)?.name})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button onClick={proceedToScanning} className="w-full">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Continue to Scan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!recognitionResult ? (
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full rounded-lg bg-black"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Liveness Check Indicator */}
                        {isCheckingLiveness && (
                          <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Checking liveness...
                          </div>
                        )}

                        {livenessResult && !livenessResult.isLive && (
                          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Spoofing detected
                          </div>
                        )}

                        {isScanning && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="border-4 border-green-500 rounded-lg w-64 h-64 animate-pulse"></div>
                          </div>
                        )}
                        
                        {isScanning && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Scanning...
                          </div>
                        )}

                        {!isScanning && !capturedImageUrl && (
                          <Button
                            onClick={() => startScanning()}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                            Start Scanning
                          </Button>
                        )}
                      </div>
                    ) : (
                      <VerificationResult
                        imageUrl={capturedImageUrl}
                        result={recognitionResult}
                        selectedDoors={selectedDoors}
                        onToggleDoor={toggleDoorSelection}
                        onReset={resetAndRestartScan}
                        onUnlock={handleUnlockDoors}
                        loading={loading}
                      />
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetEnrollForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Enroll Face
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enroll New Face</DialogTitle>
                  <DialogDescription>
                    {enrollStep === 'user-select'
                      ? 'Select user and allowed doors scan'
                      : 'Capture face image'}
                  </DialogDescription>
                </DialogHeader>

                {enrollStep === 'user-select' ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Select User</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                        {users?.map(user => (
                          <div
                            key={user._id}
                            onClick={() => setSelectedUser(user._id)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedUser === user._id
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Allowed Door Scans</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                        {doorScans.map(door => (
                          <div
                            key={door._id}
                            onClick={() => toggleRoomSelection(door._id)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedRooms.includes(door._id)
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedRooms.includes(door._id)}
                                onCheckedChange={() => toggleRoomSelection(door._id)}
                              />
                              <div className="flex-1">
                                {door.name}
                                {door?.room_id && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({rooms.find(r => r._id === door?.room_id)?.name})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedRooms.length} door scan(s) selected
                      </p>
                    </div>

                    <Button onClick={proceedToCapture} className="w-full">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Continue to Capture
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Tabs defaultValue="camera">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="camera">Camera</TabsTrigger>
                        <TabsTrigger value="upload">Upload Image</TabsTrigger>
                      </TabsList>

                      <TabsContent value="camera" className="space-y-4">
                        {!capturedImageUrl ? (
                          <div className="relative">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full rounded-lg bg-black"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {isCheckingLiveness && (
                              <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking liveness...
                              </div>
                            )}

                            {livenessResult && !livenessResult.isLive && (
                              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {livenessResult.message}
                              </div>
                            )}

                            {livenessResult && livenessResult.isLive && (
                              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Live detected
                              </div>
                            )}

                            <Button
                              onClick={handleManualCapture}
                              disabled={isCheckingLiveness}
                              className="absolute bottom-4 left-1/2 -translate-x-1/2">
                              <Camera className="w-4 h-4 mr-2" />
                              Capture
                            </Button>
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              src={capturedImageUrl}
                              alt="Captured"
                              className="w-full rounded-lg"
                            />
                            <Button
                              onClick={() => {
                                resetCapture();
                                startCamera(false);
                              }}
                              variant="secondary"
                              className="absolute bottom-4 left-1/2 -translate-x-1/2">
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Retake
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="upload">
                        {!capturedImageUrl ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                          >
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload face image
                            </p>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              src={capturedImageUrl}
                              alt="Uploaded"
                              className="w-full rounded-lg"
                            />
                            <Button
                              onClick={() => {
                                resetCapture();
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              variant="secondary"
                              className="absolute bottom-4 left-1/2 -translate-x-1/2">
                              <Upload className="w-4 h-4 mr-2" />
                              Change Image
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEnrollStep('user-select')}>Back</Button>
                      <Button onClick={handleEnrollFace} disabled={!capturedImage || loading}>
                        {loading ? 'Enrolling...' : 'Enroll Face'}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Enrolled Faces</h3>
            {faces.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No faces enrolled
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {faces.map(face => (
                  <Card key={face.face_id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {users.find(user => user._id === face.user_id)?.name}
                      </CardTitle>
                      <CardDescription>
                        {users.find(user => user._id === face.user_id)?.email}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setViewImageFace(face);
                            setIsViewImageDialogOpen(true);
                          }}>
                          <User className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(face)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteFaceId(face.face_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteFaceId} onOpenChange={() => setDeleteFaceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Face?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFace}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditFace(null);
          resetCapture();
          setSelectedRooms([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Face - {users.find(user => user._id === editFace?.user_id)?.name}
            </DialogTitle>
            <DialogDescription>Update face image or allowed doors scan</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="image">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="image">Update Image</TabsTrigger>
              <TabsTrigger value="rooms">Allowed Door Scans</TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="space-y-4">
              <Tabs defaultValue="camera">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="camera">Camera</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="camera">
                  {!capturedImageUrl ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full rounded-lg bg-black"
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {isCheckingLiveness && (
                        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Checking liveness...
                        </div>
                      )}

                      {livenessResult && !livenessResult.isLive && (
                        <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          {livenessResult.message}
                        </div>
                      )}

                      <Button
                        onClick={handleManualCapture}
                        disabled={isCheckingLiveness}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={capturedImageUrl} alt="Captured" className="w-full rounded-lg" />
                      <Button
                        onClick={() => {
                          resetCapture();
                          startCamera(false);
                        }}
                        variant="secondary"
                        className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upload">
                  {!capturedImageUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={capturedImageUrl} alt="Uploaded" className="w-full rounded-lg" />
                      <Button
                        onClick={() => {
                          resetCapture();
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        variant="secondary"
                        className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Upload className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="rooms">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {doorScans.map(door => (
                  <div
                    key={door._id}
                    onClick={() => toggleRoomSelection(door._id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedRooms.includes(door._id)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRooms.includes(door._id)}
                        onCheckedChange={() => toggleRoomSelection(door._id)}
                      />
                      <div className="flex-1">
                        {door.name}
                        {door?.room_id && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({rooms.find(r => r._id === door?.room_id)?.name})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditFace} disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewImageDialogOpen} onOpenChange={setIsViewImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{users.find(u => u._id === viewImageFace?.user_id)?.name}</DialogTitle>
            <DialogDescription>
              {users.find(u => u._id === viewImageFace?.user_id)?.email}
            </DialogDescription>
          </DialogHeader>
          {viewImageFace && (
            <div className="flex justify-center">
              <User className="w-32 h-32 text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VerificationResult({ imageUrl, result, selectedDoors, onToggleDoor, onReset, onUnlock, loading }: any) {
  if (!result.matched) {
    return (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <X className="w-10 h-10 text-red-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Unrecognized</h3>
          <p className="text-lg font-semibold mb-1">Face Not Recognized</p>
          <p className="text-sm text-muted-foreground">
            {result.message || 'This face is not enrolled in the system.'}
          </p>
        </div>
        <Button onClick={onReset} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const selectedDoor = result.available_doors?.find((d: any) => d._id === selectedDoors[0]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Matched</h3>
          <p className="text-lg font-semibold">{result.name}</p>
          <p className="text-sm text-muted-foreground">{result.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Confidence: {result.confidence}%
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Door Access</h4>
        {selectedDoor && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedDoor.room?.name || 'No Room'}</p>
                  <p className="text-sm text-muted-foreground">{selectedDoor.name}</p>
                  <Badge variant={selectedDoor.is_locked ? "destructive" : "default"} className="mt-1">
                    {selectedDoor.is_locked ? "Locked" : "Unlocked"}
                  </Badge>
                </div>
                <div>
                  {selectedDoor.is_locked ? <Lock className="w-6 h-6" /> : <DoorOpen className="w-6 h-6" />}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {loading ? (
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Controlling door...</p>
          <p className="text-xs text-muted-foreground">Please wait...</p>
        </div>
      ) : (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <p className="text-sm font-medium">✓ Door action completed automatically</p>
          </div>
          <p className="text-xs text-muted-foreground">This dialog will close in a moment...</p>
        </div>
      )}
    </div>
  );
}