import AdminLayout from "@/components/layout/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ClipboardList, Swords, Video, UserCheck, Trophy } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) return <AdminLayout>Loading...</AdminLayout>;

  const statCards = [
    { label: "Interest Submissions", value: stats?.interests || 0, icon: Users, color: "text-blue-500" },
    { label: "Total Events", value: stats?.events || 0, icon: Calendar, color: "text-purple-500" },
    { label: "Event Registrations", value: stats?.registrations || 0, icon: ClipboardList, color: "text-green-500" },
    { label: "Matches Recorded", value: stats?.matches || 0, icon: Swords, color: "text-orange-500" },
    { label: "VODs Archived", value: stats?.vods || 0, icon: Video, color: "text-red-500" },
    { label: "Registered Players", value: stats?.players || 0, icon: UserCheck, color: "text-cyan-500" },
    { label: "Seasons", value: stats?.seasons || 0, icon: Trophy, color: "text-yellow-500" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-3xl font-display font-bold mb-8">System Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-card/50 border-border/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
