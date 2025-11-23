'use client';

import { useState, useEffect, useRef } from 'react';
import { faceAPI } from '@/lib/api';
import { Camera, Plus, Trash2, User, Check, X } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

interface FaceProfile {
  _id: string;
  name: string;
  images: string[];
  is_active: boolean;
  created_at: string;
}

interface RecognitionResult {
  recognized: boolean;
  profile_id?: string;
  name?: string;
  confidence?: number;
}

export default function FaceRecognitionPage() {
  const [profiles, setProfiles] = useState<FaceProfile[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRecognizeDialogOpen, setIsRecognizeDialogOpen] = useState(false);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await faceAPI.getProfiles();
      setProfiles(response.data.data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
      }
    }
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImage) {
      alert('Please capture an image first');
      return;
    }

    setLoading(true);
    try {
      const profileRes = await faceAPI.createProfile({ name: profileName });
      const profileId = profileRes.data.data._id;
      
      await faceAPI.addImage(profileId, capturedImage);
      
      await fetchProfiles();
      setIsAddDialogOpen(false);
      setProfileName('');
      setCapturedImage(null);
      stopCamera();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRecognize = async () => {
    if (!capturedImage) {
      alert('Please capture an image first');
      return;
    }

    setLoading(true);
    try {
      const response = await faceAPI.recognize(capturedImage);
      setRecognitionResult(response.data.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Recognition failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!deleteProfileId) return;
    
    try {
      await faceAPI.deleteProfile(deleteProfileId);
      await fetchProfiles();
      setDeleteProfileId(null);
    } catch (error) {
      alert('Failed to delete profile');
    }
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Face Recognition</h1>
          <p className="text-muted-foreground">Manage authorized faces</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isRecognizeDialogOpen} onOpenChange={setIsRecognizeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={startCamera}>
                <Camera className="w-4 h-4 mr-2" />
                Recognize Face
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Face Recognition</DialogTitle>
                <DialogDescription>
                  Capture a face to recognize
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {!capturedImage ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      className="w-full rounded-lg"
                    />
                    <Button
                      onClick={captureImage}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Capture
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
                    
                    {recognitionResult && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            {recognitionResult.recognized ? (
                              <>
                                <Check className="w-5 h-5 text-green-500 mr-2" />
                                Face Recognized!
                              </>
                            ) : (
                              <>
                                <X className="w-5 h-5 text-red-500 mr-2" />
                                Unknown Face
                              </>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {recognitionResult.recognized ? (
                            <div>
                              <p className="text-lg font-medium">{recognitionResult.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Confidence: {(recognitionResult.confidence! * 100).toFixed(1)}%
                              </p>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">
                              This face is not in the database
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          setCapturedImage(null);
                          setRecognitionResult(null);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Retake
                      </Button>
                      <Button
                        onClick={handleRecognize}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? 'Recognizing...' : 'Recognize'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRecognizeDialogOpen(false);
                    setCapturedImage(null);
                    setRecognitionResult(null);
                    stopCamera();
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCamera}>
                <Plus className="w-4 h-4 mr-2" />
                Add Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleAddProfile}>
                <DialogHeader>
                  <DialogTitle>Add Face Profile</DialogTitle>
                  <DialogDescription>
                    Register a new authorized face
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Person Name</Label>
                    <Input
                      id="name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  {!capturedImage ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        className="w-full rounded-lg"
                      />
                      <Button
                        type="button"
                        onClick={captureImage}
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Face
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <img src={capturedImage} alt="Captured" className="w-full rounded-lg" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCapturedImage(null)}
                        className="w-full mt-2"
                      >
                        Retake Photo
                      </Button>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setProfileName('');
                      setCapturedImage(null);
                      stopCamera();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !capturedImage}>
                    {loading ? 'Adding...' : 'Add Profile'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {profiles.map((profile) => (
          <Card key={profile._id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {profile.images.length} image(s)
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteProfileId(profile._id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profiles.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No face profiles yet</p>
          <Button onClick={() => {
            setIsAddDialogOpen(true);
            startCamera();
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Profile
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProfileId} onOpenChange={() => setDeleteProfileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Face Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the face profile and all associated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
