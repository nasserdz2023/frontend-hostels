"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { youthHostelsApi, YouthHostel } from "@/lib/api/youth-hostels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  MapPin, 
  Phone, 
  Mail,
  Users, 
  Bed,
  Plus,
  Building2
} from "lucide-react";

export default function YouthHostelsAdminPage() {
  const t = useTranslations("youth_hostels");
  const router = useRouter();
  
  const [hostels, setHostels] = useState<YouthHostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadHostels();
  }, []);

  const loadHostels = async () => {
    setIsLoading(true);
    try {
      const data = await youthHostelsApi.getHostels();
      setHostels(data);
    } catch (error) {
      console.error("Error loading hostels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHostels = hostels.filter(h => 
    h.name_ar.toLowerCase().includes(search.toLowerCase()) ||
    h.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("admin_dashboard")}</h1>
          <p className="text-muted-foreground">{t("manage_hostels")}</p>
        </div>
        <Link href="/institutions?type=YOUTH_HOSTEL">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("add_hostel")}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hostels.length}</p>
                <p className="text-xs text-muted-foreground">{t("total_hostels")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bed className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hostels.reduce((sum, h) => sum + h.total_beds, 0)}</p>
                <p className="text-xs text-muted-foreground">{t("total_beds")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hostels.reduce((sum, h) => sum + h.available_beds, 0)}</p>
                <p className="text-xs text-muted-foreground">{t("available_beds")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {hostels.length > 0 
                    ? Math.round(hostels.reduce((sum, h) => sum + (h.occupancy_rate || 0), 0) / hostels.length)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">{t("avg_occupancy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hostels List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredHostels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("no_hostels")}</p>
            <Link href="/institutions?type=YOUTH_HOSTEL" className="mt-4 block">
              <Button variant="outline">{t("add_first_hostel")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHostels.map((hostel) => (
            <Card key={hostel.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{hostel.name_ar}</CardTitle>
                {hostel.short_name && (
                  <p className="text-sm text-muted-foreground">{hostel.short_name}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hostel.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{hostel.address}</span>
                    </div>
                  )}
                  {hostel.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{hostel.phone}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold">{hostel.total_beds}</p>
                    <p className="text-xs text-muted-foreground">{t("beds")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{hostel.available_beds}</p>
                    <p className="text-xs text-muted-foreground">{t("available")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">{hostel.occupancy_rate}%</p>
                    <p className="text-xs text-muted-foreground">{t("occupied")}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link href={`/admin-hostels/${hostel.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      {t("manage")}
                    </Button>
                  </Link>
                  <Link href={`/admin-hostels/${hostel.id}/wings`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      {t("wings")}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}