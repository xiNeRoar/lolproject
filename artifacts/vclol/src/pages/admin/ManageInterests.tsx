import AdminLayout from "@/components/layout/AdminLayout";
import { useListInterests, useDeleteInterest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function ManageInterests() {
  const { data: interests, isLoading } = useListInterests();
  const deleteMutation = useDeleteInterest();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    if (confirm("Delete this submission?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/interests'] })
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Interest Submissions</h1>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Riot ID</th>
              <th className="px-6 py-3">Discord</th>
              <th className="px-6 py-3">Rank / City</th>
              <th className="px-6 py-3">Format</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : interests?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">No submissions yet</td></tr>
            ) : (
              interests?.map((item) => (
                <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                  <td className="px-6 py-4 font-medium">{item.riotId}</td>
                  <td className="px-6 py-4">{item.discordUsername}</td>
                  <td className="px-6 py-4">{item.currentRank} <br/><span className="text-xs text-muted-foreground">{item.city}</span></td>
                  <td className="px-6 py-4">{item.preferredFormat}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
