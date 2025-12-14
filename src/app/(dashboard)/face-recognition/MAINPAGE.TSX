// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { Camera, Plus, Trash2, User, Check, X, Lock, Upload, DoorOpen, MapPin, Loader2, RefreshCw, ArrowRight, Edit } from 'lucide-react';

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
// import { authAPI, faceAPI, roomAPI } from '@/lib/api';

// // Mock API - replace with your actual API
// const API_BASE_URL = 'http://localhost:5000';

// // Mock data
// const mockUsers = [
//   { id: '1', name: 'John Doe', email: 'john@example.com' },
//   { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
// ];

// const mockRooms = [
//   { _id: '1', name: 'Living Room' },
//   { _id: '2', name: 'Bedroom' },
//   { _id: '3', name: 'Office' }
// ];

// const mockFaces = [
//   {
//     face_id: '1',
//     user_id: '1',
//     name: 'John Doe',
//     email: 'john@example.com',
//     allowed_rooms: ['1', '2'],
//     image_url: '/api/placeholder/150/150',
//     created_at: '2024-01-15T10:00:00Z',
//     recognition_count: 42,
//     last_recognized: '2024-01-20T15:30:00Z'
//   },
//   {
//     face_id: '2',
//     user_id: '2',
//     name: 'Jane Smith',
//     email: 'jane@example.com',
//     allowed_rooms: ['2', '3'],
//     image_url: '/api/placeholder/150/150',
//     created_at: '2024-01-16T11:00:00Z',
//     recognition_count: 28,
//     last_recognized: '2024-01-19T09:15:00Z'
//   }
// ];

// interface Face {
//   face_id: string;
//   user_id?: string;
//   name: string;
//   email: string;
//   allowed_rooms: string[];
//   image_path?: string;
//   created_at: string;
//   recognition_count: number;
//   last_recognized: string | null;
// }

// interface Room {
//   _id: string;
//   name: string;
// }

// interface UserOption {
//   id: string;
//   name: string;
//   email: string;
// }

// export default function FaceRecognitionPage() {
//   const [faces, setFaces] = useState<Face[]>([]);
//   const [rooms, setRooms] = useState<Room[]>([]);
//   const [users, setUsers] = useState<UserOption[]>([]);
  
//   // Dialog States
//   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
//   const [isRecognizeDialogOpen, setIsRecognizeDialogOpen] = useState(false);
//   const [deleteFaceId, setDeleteFaceId] = useState<string | null>(null);
//   const [editingFace, setEditingFace] = useState<Face | null>(null);
  
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
//   const [recognitionResult, setRecognitionResult] = useState<any>(null);
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
//       setRooms(response.data.data || []);
//     } catch (error) {
//       console.error('Error fetching rooms:', error);
//     }
//   };

//   const fetchUsers = async () => {
//     try {
//       const response = await authAPI.getUsers();
//       setUsers(response.data.data || []);
//     } catch (error) {
//       console.error('Error fetching users:', error);
//     }
//   };

//   const handleEditFace = (face: Face) => {
//     setEditingFace(face);
//     setSelectedRooms(face.allowed_rooms || []);
//     setIsEditDialogOpen(true);
//   };

//   const handleUpdateFace = async () => {
//     if (!editingFace || selectedRooms.length === 0) {
//       alert('Please select at least one room');
//       return;
//     }
    
//     setLoading(true);
//     try {
//       const formData = new FormData();
//       formData.append('allowed_rooms', JSON.stringify(selectedRooms));
      
//       // If new image was captured
//       if (capturedImage) {
//         formData.append('image', capturedImage, 'face.jpg');
//       }
      
//       await faceAPI.updateFace(editingFace.face_id, formData);
//       await fetchFaces();
//       setIsEditDialogOpen(false);
//       resetEditForm();
//       alert('✅ Face updated successfully!');
//     } catch (error: any) {
//       alert(error.response?.data?.message || 'Failed to update face');
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
//       alert('✅ Face deleted successfully!');
//     } catch (error) {
//       alert('Failed to delete face');
//     }
//   };

//   const resetCapture = () => {
//     setCapturedImage(null);
//     setCapturedImageUrl(null);
//   };

//   const resetEditForm = () => {
//     setEditingFace(null);
//     setSelectedRooms([]);
//     resetCapture();
//   };

//   const toggleRoomSelection = (roomId: string) => {
//     setSelectedRooms(prev => 
//       prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
//     );
//   };

//   const getImageUrl = (face: Face) => {
//     console.log("fce", face);
    
//     // If image_url is provided, use it
//     if (face?.image_path) {
//       // If it's a relative path, prepend API base URL
//       if (face.image_path.startsWith('/api/')) {
//         return `${process.env.NEXT_PUBLIC_API_URL}${face.image_path}`;
//       }
//       return face.image_path;
//     }
//     // Fallback placeholder
//     return '/api/placeholder/150/150';
//   };

//   const getRoomNames = (roomIds: string[]) => {
//     return roomIds
//       .map(id => rooms.find(r => r._id === id)?.name)
//       .filter(Boolean)
//       .join(', ') || 'No rooms';
//   };

//   return (
//     <div className="container mx-auto p-8 max-w-6xl">
//       <div className="flex items-center justify-between mb-8">
//         <div>
//           <h1 className="text-3xl font-bold">Face Recognition</h1>
//           <p className="text-muted-foreground">AI-powered facial recognition for door access</p>
//         </div>
//         <div className="flex space-x-2">
//           <Button variant="outline">
//             <Camera className="w-4 h-4 mr-2" />
//             Verify Face
//           </Button>
//           <Button>
//             <Plus className="w-4 h-4 mr-2" />
//             Enroll Face
//           </Button>
//         </div>
//       </div>

//       {/* Enrolled Faces List */}
//       {JSON.stringify(faces, null, 2)}
//       <Card>
//         <CardHeader>
//           <CardTitle>Enrolled Faces ({faces.length})</CardTitle>
//           <CardDescription>Manage facial recognition profiles</CardDescription>
//         </CardHeader>
//         <CardContent>
//           {faces.length === 0 ? (
//             <div className="text-center py-12">
//               <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
//               <p className="text-lg font-semibold mb-2">No faces enrolled</p>
//               <p className="text-muted-foreground mb-6">Start by enrolling your first face</p>
//               <Button>
//                 <Plus className="w-4 h-4 mr-2" />
//                 Enroll Face
//               </Button>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {faces.map(face => (
//                 <Card key={face.face_id} className="overflow-hidden hover:shadow-lg transition-shadow">
//                   <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5">
//                     <img 
//                       src={getImageUrl(face)}
//                       alt={face.name}
//                       className="w-full h-full object-cover"
//                       onError={(e) => {
//                         e.currentTarget.src = '/api/placeholder/150/150';
//                       }}
//                       crossOrigin="anonymous"  // <--- ADD THIS
//                     />
                    
//                     {JSON.stringify(getImageUrl(face), null, 2)}
//                     <div className="absolute top-2 right-2 flex gap-1">
//                       <Button 
//                         size="sm" 
//                         variant="secondary"
//                         className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
//                         onClick={() => handleEditFace(face)}
//                       >
//                         <Edit className="w-4 h-4" />
//                       </Button>
//                       <Button 
//                         size="sm" 
//                         variant="destructive"
//                         className="h-8 w-8 p-0 bg-white/90 hover:bg-red-100 text-red-600"
//                         onClick={() => setDeleteFaceId(face.face_id)}
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </Button>
//                     </div>
//                   </div>
//                   <CardContent className="pt-4">
//                     <div className="space-y-3">
//                       <div>
//                         <h3 className="font-semibold text-lg">{face.name}</h3>
//                         <p className="text-sm text-muted-foreground">{face.email}</p>
//                       </div>
                      
//                       <div className="space-y-2 text-sm">
//                         <div className="flex items-start gap-2">
//                           <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
//                           <span className="text-muted-foreground">{getRoomNames(face.allowed_rooms)}</span>
//                         </div>
                        
//                         <div className="flex items-center justify-between pt-2 border-t">
//                           <span className="text-muted-foreground">Recognitions:</span>
//                           <Badge variant="secondary">{face.recognition_count}</Badge>
//                         </div>
                        
//                         {face.last_recognized && (
//                           <div className="text-xs text-muted-foreground">
//                             Last seen: {new Date(face.last_recognized).toLocaleDateString()}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* EDIT FACE DIALOG */}
//       <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
//         setIsEditDialogOpen(open);
//         if (!open) resetEditForm();
//       }}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle>Edit Face Profile</DialogTitle>
//             <DialogDescription>
//               Update room access for {editingFace?.name}
//             </DialogDescription>
//           </DialogHeader>
          
//           <div className="space-y-4 py-4">
//             {/* Current Image */}
//             <div className="flex justify-center">
//               <div className="relative">
//                 <img 
//                   src={capturedImageUrl || getImageUrl(editingFace!)}
//                   alt={editingFace?.name}
//                   className="w-48 h-48 rounded-lg object-cover border-2"
//                 />
//                 {!capturedImageUrl && (
//                   <Button
//                     size="sm"
//                     variant="secondary"
//                     className="absolute bottom-2 right-2"
//                     onClick={() => {
//                       // Trigger camera or upload
//                       fileInputRef.current?.click();
//                     }}
//                   >
//                     <Camera className="w-4 h-4 mr-1" />
//                     Update
//                   </Button>
//                 )}
//                 {capturedImageUrl && (
//                   <Button
//                     size="sm"
//                     variant="secondary"
//                     className="absolute bottom-2 right-2"
//                     onClick={resetCapture}
//                   >
//                     Reset
//                   </Button>
//                 )}
//               </div>
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/*"
//                 className="hidden"
//                 onChange={(e) => {
//                   const file = e.target.files?.[0];
//                   if (file) {
//                     setCapturedImage(file);
//                     setCapturedImageUrl(URL.createObjectURL(file));
//                   }
//                 }}
//               />
//             </div>

//             {/* Room Selection */}
//             <div className="space-y-2">
//               <Label>Allowed Rooms</Label>
//               <div className="border rounded-lg p-4 space-y-2 max-h-[300px] overflow-y-auto">
//                 {rooms.map(room => (
//                   <div 
//                     key={room._id} 
//                     className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
//                     onClick={() => toggleRoomSelection(room._id)}
//                   >
//                     <div className="flex items-center gap-2">
//                       <Checkbox 
//                         checked={selectedRooms.includes(room._id)} 
//                         onCheckedChange={() => toggleRoomSelection(room._id)} 
//                       />
//                       <MapPin className="w-4 h-4 text-muted-foreground" />
//                       <span>{room.name}</span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 {selectedRooms.length} room(s) selected
//               </p>
//             </div>
//           </div>

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button 
//               onClick={handleUpdateFace} 
//               disabled={loading || selectedRooms.length === 0}
//             >
//               {loading ? 'Updating...' : 'Update Face'}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* DELETE CONFIRMATION */}
//       <AlertDialog open={!!deleteFaceId} onOpenChange={() => setDeleteFaceId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Delete Face?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This action cannot be undone. This will permanently delete the face profile and all associated data.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={handleDeleteFace} className="bg-destructive">
//               Delete
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       <canvas ref={canvasRef} style={{ display: 'none' }} />
//     </div>
//   );
// }