import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { adminService } from "@/lib/services/adminService";
import { format } from "date-fns";

interface DailyUser {
  user_id: string;
  full_name: string;
  email: string;
  first_login: string;
  last_activity: string;
  login_count: number;
  ip_address?: string;
  user_agent?: string;
}

const DailyLogins = () => {
  const [users, setUsers] = useState<DailyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await adminService.getUsersLoggedOnToday();
        setUsers(data);
      } catch (error) {
        console.error("Error loading daily logins:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Refresh every minute
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users Logged On Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Users Logged On Today
          <Badge variant="secondary" className="ml-2">
            {users.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>First Login</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Session Duration</TableHead>
              <TableHead>Logins</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No users have logged in today
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.full_name || "Unknown User"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.first_login), "HH:mm")}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.last_activity), "HH:mm")}
                  </TableCell>
                  <TableCell>
                    {formatDuration(user.first_login, user.last_activity)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.login_count}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DailyLogins;
