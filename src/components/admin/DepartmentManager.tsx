/**
 * File: DepartmentManager.tsx
 * Purpose: Admin component for managing departments in the system
 * Description: This component provides a UI for administrators to view, add, edit, and delete
 * departments. It includes a form for adding new departments, a table displaying existing departments,
 * and functionality for editing and deleting departments with appropriate validation and confirmation.
 *
 * Imports from:
 * - React core libraries
 * - UI components from shadcn/ui
 * - Supabase client for database operations
 * - Lucide icons
 *
 * Called by: src/pages/AdminPage.tsx
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Department {
  id: string;
  name: string;
  created_at?: string;
}

const DepartmentManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(null);
  const [editingDepartment, setEditingDepartment] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      // Expected error handler for failed departments query
      console.error("Error loading departments:", error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    try {
      if (!newDepartmentName.trim()) {
        toast({
          title: "Error",
          description: "Department name is required",
          variant: "destructive",
        });
        return;
      }

      // Check if department already exists
      const existingDept = departments.find(
        (dept) =>
          dept.name.toLowerCase() === newDepartmentName.trim().toLowerCase(),
      );

      if (existingDept) {
        toast({
          title: "Error",
          description: "A department with this name already exists",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("departments")
        .insert({
          name: newDepartmentName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department added successfully",
      });

      setDepartments([...departments, data]);
      setNewDepartmentName("");
    } catch (error) {
      // Expected error handler for failed department insert
      console.error("Error adding department:", error);
      toast({
        title: "Error",
        description: "Failed to add department",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      if (!selectedDepartmentId) return;

      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", selectedDepartmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Department deleted successfully",
      });

      setDepartments(
        departments.filter((dept) => dept.id !== selectedDepartmentId),
      );
      setSelectedDepartmentId(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      // Expected error handler for failed department delete
      console.error("Error deleting department:", error);
      toast({
        title: "Error",
        description: "Failed to delete department",
        variant: "destructive",
      });
    }
  };

  const startEditing = (department: Department) => {
    setEditingDepartment({
      id: department.id,
      name: department.name,
    });
  };

  const cancelEditing = () => {
    setEditingDepartment(null);
  };

  const saveDepartment = async () => {
    try {
      if (!editingDepartment) return;

      if (!editingDepartment.name.trim()) {
        toast({
          title: "Error",
          description: "Department name cannot be empty",
          variant: "destructive",
        });
        return;
      }

      // Check if name already exists (excluding current department)
      const nameExists = departments.some(
        (dept) =>
          dept.id !== editingDepartment.id &&
          dept.name.toLowerCase() ===
            editingDepartment.name.trim().toLowerCase(),
      );

      if (nameExists) {
        toast({
          title: "Error",
          description: "A department with this name already exists",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("departments")
        .update({ name: editingDepartment.name.trim() })
        .eq("id", editingDepartment.id);

      if (error) throw error;

      // Update local state
      setDepartments(
        departments.map((dept) =>
          dept.id === editingDepartment.id
            ? { ...dept, name: editingDepartment.name.trim() }
            : dept,
        ),
      );

      setEditingDepartment(null);

      toast({
        title: "Success",
        description: "Department updated successfully",
      });
    } catch (error) {
      // Expected error handler for failed department update
      console.error("Error updating department:", error);
      toast({
        title: "Error",
        description: "Failed to update department",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-foreground">Department Management</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="new-department" className="sr-only">
              New Department
            </Label>
            <Input
              id="new-department"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              placeholder="Enter department name"
              className="w-full"
            />
          </div>
          <Button
            onClick={handleAddDepartment}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      No departments found. Add some using the form above.
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">
                        {editingDepartment?.id === department.id ? (
                          <Input
                            value={editingDepartment.name}
                            onChange={(e) =>
                              setEditingDepartment({
                                ...editingDepartment,
                                name: e.target.value,
                              })
                            }
                            autoFocus
                          />
                        ) : (
                          department.name
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingDepartment?.id === department.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveDepartment}
                              className="text-success hover:text-success hover:bg-success/10"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(department)}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDepartmentId(department.id);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this department from the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DepartmentManager;