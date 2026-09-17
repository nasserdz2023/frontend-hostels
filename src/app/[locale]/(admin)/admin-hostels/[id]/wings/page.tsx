"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { youthHostelsApi, Wing, Room, YouthHostel } from "@/lib/api/youth-hostels";
import { 
  ArrowLeft, 
  Plus, 
  DoorOpen, 
  Edit, 
  Trash2,
  Users,
  Bed,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";

export default function WingsManagementPage() {
  const t = useTranslations("youth_hostels");
  const params = useParams();
  const router = useRouter();
  const hostelId = params.id as string;

  const [hostel, setHostel] = useState<YouthHostel | null>(null);
  const [wings, setWings] = useState<Wing[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWing, setSelectedWing] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWing, setEditingWing] = useState<Partial<Wing> | null>(null);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);

  useEffect(() => {
    if (hostelId) {
      loadData();
    }
  }, [hostelId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [hostelData, wingsData] = await Promise.all([
        youthHostelsApi.getHostel(hostelId),
        youthHostelsApi.getWings(hostelId)
      ]);
      setHostel(hostelData);
      setWings(wingsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRooms = async (wingId: string) => {
    try {
      const roomsData = await youthHostelsApi.getRooms(wingId);
      setRooms(prev => ({ ...prev, [wingId]: roomsData }));
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  const handleCreateWing = async () => {
    if (!editingWing?.wing_type || !editingWing?.name_ar) {
      toast.error(t("fill_required"));
      return;
    }
    try {
      const newWing = await youthHostelsApi.createWing(hostelId, {
        wing_type: editingWing.wing_type,
        name_ar: editingWing.name_ar,
        name_fr: editingWing.name_fr,
        floor: editingWing.floor || 1,
      });
      setWings([...wings, newWing]);
      setIsDialogOpen(false);
      setEditingWing(null);
      toast.success(t("wing_created"));
    } catch (error) {
      console.error("Error creating wing:", error);
      toast.error(t("error_creating"));
    }
  };

  const handleUpdateWing = async () => {
    if (!editingWing?.id) return;
    try {
      await youthHostelsApi.updateWing(editingWing.id, editingWing);
      setWings(wings.map(w => w.id === editingWing.id ? { ...w, ...editingWing } : w));
      setIsDialogOpen(false);
      setEditingWing(null);
      toast.success(t("wing_updated"));
    } catch (error) {
      console.error("Error updating wing:", error);
      toast.error(t("error_updating"));
    }
  };

  const handleDeleteWing = async (wingId: string) => {
    if (!confirm(t("confirm_delete_wing"))) return;
    try {
      await youthHostelsApi.deleteWing(wingId);
      setWings(wings.filter(w => w.id !== wingId));
      toast.success(t("wing_deleted"));
    } catch (error) {
      console.error("Error deleting wing:", error);
      toast.error(t("error_deleting"));
    }
  };

  const handleCreateRoom = async (wingId: string) => {
    if (!editingRoom?.room_number) {
      toast.error(t("fill_required"));
      return;
    }
    try {
      const newRoom = await youthHostelsApi.createRoom(wingId, {
        room_number: editingRoom.room_number,
        floor: editingRoom.floor || 1,
        room_type: editingRoom.room_type || 'STANDARD',
        price_per_bed: editingRoom.price_per_bed || 0,
        has_air_conditioning: editingRoom.has_air_conditioning || false,
        has_hot_water: editingRoom.has_hot_water || false,
        has_balcony: editingRoom.has_balcony || false,
      });
      setRooms(prev => ({ ...prev, [wingId]: [...(prev[wingId] || []), newRoom] }));
      setIsRoomDialogOpen(false);
      setEditingRoom(null);
      toast.success(t("room_created"));
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error(t("error_creating"));
    }
  };

  const handleDeleteRoom = async (roomId: string, wingId: string) => {
    if (!confirm(t("confirm_delete_room"))) return;
    try {
      await youthHostelsApi.deleteRoom(roomId);
      setRooms(prev => ({
        ...prev,
        [wingId]: (prev[wingId] || []).filter(r => r.id !== roomId)
      }));
      toast.success(t("room_deleted"));
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(t("error_deleting"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.push(`/admin-hostels/${hostelId}`)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t("back")}
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("wings_management")}</h1>
          <p className="text-muted-foreground">{hostel?.name_ar}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingWing({ wing_type: 'MALE', name_ar: '', floor: 1 })}>
              <Plus className="h-4 w-4 mr-2" />
              {t("add_wing")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWing?.id ? t("edit_wing") : t("add_wing")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("wing_type")} *</Label>
                <Select
                  value={editingWing?.wing_type}
                  onValueChange={(v) => setEditingWing({...editingWing, wing_type: v as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">{t("male_wing")}</SelectItem>
                    <SelectItem value="FEMALE">{t("female_wing")}</SelectItem>
                    <SelectItem value="VIP">{t("vip_rooms")}</SelectItem>
                    <SelectItem value="SPECIAL">{t("special_housing")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("name_ar")} *</Label>
                <Input
                  value={editingWing?.name_ar || ''}
                  onChange={(e) => setEditingWing({...editingWing, name_ar: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("name_fr")}</Label>
                <Input
                  value={editingWing?.name_fr || ''}
                  onChange={(e) => setEditingWing({...editingWing, name_fr: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("floor")}</Label>
                <Input
                  type="number"
                  value={editingWing?.floor || 1}
                  onChange={(e) => setEditingWing({...editingWing, floor: parseInt(e.target.value)})}
                />
              </div>
              <Button onClick={editingWing?.id ? handleUpdateWing : handleCreateWing}>
                {editingWing?.id ? t("update") : t("create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wings List */}
      {wings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DoorOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("no_wings")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {wings.map((wing) => (
            <Card key={wing.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {wing.wing_type === 'MALE' && t("male_wing")}
                    {wing.wing_type === 'FEMALE' && t("female_wing")}
                    {wing.wing_type === 'VIP' && t("vip_rooms")}
                    {wing.wing_type === 'SPECIAL' && t("special_housing")}
                    <Badge variant={wing.is_active ? "default" : "secondary"}>
                      {wing.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingWing(wing);
                      setIsDialogOpen(true);
                    }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteWing(wing.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("floor")}: {wing.floor} | {t("total_beds")}: {wing.total_beds} | {t("available")}: {wing.available_beds}
                </p>
              </CardHeader>
              <CardContent>
                {/* Rooms Grid */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium">{t("rooms")}</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingRoom({ room_number: '', floor: wing.floor, room_type: 'STANDARD' });
                    setSelectedWing(wing.id);
                    setIsRoomDialogOpen(true);
                  }}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t("add_room")}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {(rooms[wing.id] || []).map((room) => (
                    <div key={room.id} className="p-2 border rounded text-center">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{t("room")} {room.room_number}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRoom(room.id, wing.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {room.total_beds}/{room.available_beds} {t("beds")}
                      </div>
                      <div className="text-xs text-primary">
                        {room.price_per_bed} {t("currency")}
                      </div>
                    </div>
                  )) || (
                    <p className="col-span-6 text-center text-muted-foreground py-4">
                      {t("no_rooms")}
                    </p>
                  )}
                </div>

                {/* Dialog for adding room */}
                <Dialog open={isRoomDialogOpen && selectedWing === wing.id} onOpenChange={setIsRoomDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("add_room")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("room_number")} *</Label>
                        <Input
                          value={editingRoom?.room_number || ''}
                          onChange={(e) => setEditingRoom({...editingRoom, room_number: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("floor")}</Label>
                        <Input
                          type="number"
                          value={editingRoom?.floor || 1}
                          onChange={(e) => setEditingRoom({...editingRoom, floor: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("room_type")}</Label>
                        <Select
                          value={editingRoom?.room_type}
                          onValueChange={(v) => setEditingRoom({...editingRoom, room_type: v as any})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STANDARD">{t("standard")}</SelectItem>
                            <SelectItem value="VIP">{t("vip")}</SelectItem>
                            <SelectItem value="SPECIAL">{t("special")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("price_per_bed")}</Label>
                        <Input
                          type="number"
                          value={editingRoom?.price_per_bed || 0}
                          onChange={(e) => setEditingRoom({...editingRoom, price_per_bed: parseFloat(e.target.value)})}
                        />
                      </div>
                      <Button onClick={() => handleCreateRoom(wing.id)}>
                        {t("create")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}