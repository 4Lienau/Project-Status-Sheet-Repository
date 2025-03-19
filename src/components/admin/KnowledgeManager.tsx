import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Trash2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  embedding?: any;
}

const CATEGORIES = [
  "Project Planning",
  "Risk Management",
  "Stakeholder Management",
  "Budget Management",
  "Schedule Management",
  "Resource Management",
  "Quality Management",
  "Communication",
  "Change Management",
  "Project Closure",
  "Best Practices",
  "Templates",
];

const KnowledgeManager: React.FC = () => {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [processingEmbedding, setProcessingEmbedding] = useState<string | null>(
    null,
  );

  const [newItem, setNewItem] = useState({
    title: "",
    content: "",
    category: CATEGORIES[0],
  });

  const { toast } = useToast();

  useEffect(() => {
    loadKnowledgeItems();
  }, []);

  const loadKnowledgeItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pm_knowledge")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKnowledgeItems(data || []);
    } catch (error) {
      console.error("Error loading knowledge items:", error);
      toast({
        title: "Error",
        description: "Failed to load knowledge items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      if (!newItem.title.trim() || !newItem.content.trim()) {
        toast({
          title: "Error",
          description: "Title and content are required",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("pm_knowledge")
        .insert({
          title: newItem.title,
          content: newItem.content,
          category: newItem.category,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Knowledge item added successfully",
      });

      setKnowledgeItems([data, ...knowledgeItems]);
      setNewItem({ title: "", content: "", category: CATEGORIES[0] });
      setIsAddDialogOpen(false);

      // Generate embedding
      await generateEmbedding(data.id);
    } catch (error) {
      console.error("Error adding knowledge item:", error);
      toast({
        title: "Error",
        description: "Failed to add knowledge item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async () => {
    try {
      if (!selectedItemId) return;

      const { error } = await supabase
        .from("pm_knowledge")
        .delete()
        .eq("id", selectedItemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Knowledge item deleted successfully",
      });

      setKnowledgeItems(
        knowledgeItems.filter((item) => item.id !== selectedItemId),
      );
      setSelectedItemId(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting knowledge item:", error);
      toast({
        title: "Error",
        description: "Failed to delete knowledge item",
        variant: "destructive",
      });
    }
  };

  const generateEmbedding = async (id: string) => {
    try {
      setProcessingEmbedding(id);

      // Get JWT token for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to generate embeddings",
          variant: "destructive",
        });
        return;
      }

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate embedding");
      }

      toast({
        title: "Success",
        description: "Embedding generated successfully",
      });

      // Refresh the list to show the updated embedding status
      loadKnowledgeItems();
    } catch (error) {
      console.error("Error generating embedding:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate embedding",
        variant: "destructive",
      });
    } finally {
      setProcessingEmbedding(null);
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-blue-800">
            Project Management Knowledge Base
          </CardTitle>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Add Knowledge
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Embedding</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knowledgeItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No knowledge items found. Add some to help Project Pilot
                      provide better assistance.
                    </TableCell>
                  </TableRow>
                ) : (
                  knowledgeItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {item.embedding ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                            Generated
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateEmbedding(item.id)}
                            disabled={processingEmbedding === item.id}
                            className="flex items-center gap-1"
                          >
                            {processingEmbedding === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Generate
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Knowledge Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Project Management Knowledge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newItem.title}
                onChange={(e) =>
                  setNewItem({ ...newItem, title: e.target.value })
                }
                placeholder="Enter knowledge title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newItem.category}
                onValueChange={(value) =>
                  setNewItem({ ...newItem, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={newItem.content}
                onChange={(e) =>
                  setNewItem({ ...newItem, content: e.target.value })
                }
                placeholder="Enter knowledge content"
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add Knowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this knowledge item from the
              database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default KnowledgeManager;
