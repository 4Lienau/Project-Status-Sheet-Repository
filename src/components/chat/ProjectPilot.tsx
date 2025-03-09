import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, Minimize2, Maximize2, Bot, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { chatService } from "@/lib/services/chatService";
import { useToast } from "@/components/ui/use-toast";

interface ProjectPilotProps {
  projectId?: string;
  projectTitle?: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}

const ProjectPilot: React.FC<ProjectPilotProps> = ({
  projectId = "default-project",
  projectTitle = "Untitled Project",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize position when chat opens
  useEffect(() => {
    if (isOpen && cardRef.current) {
      // Only set initial position if it hasn't been moved yet
      if (position.x === 0 && position.y === 0) {
        const rect = cardRef.current.getBoundingClientRect();
        setPosition({
          x: rect.left,
          y: rect.top,
        });
      }
    }
  }, [isOpen]);

  // Handle drag events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest(".drag-handle")) {
      setIsDragging(true);

      // Store the initial mouse position and card position
      const initialMouseX = e.clientX;
      const initialMouseY = e.clientY;
      const initialCardX = position.x;
      const initialCardY = position.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - initialMouseX;
        const deltaY = moveEvent.clientY - initialMouseY;

        setPosition({
          x: initialCardX + deltaX,
          y: initialCardY + deltaY,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  // Reset position when chat is closed
  const handleClose = () => {
    setIsOpen(false);
    setPosition({ x: 0, y: 0 });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!message.trim()) return;

    // Store the user message
    const userMessage = message;
    setMessage("");

    // Add user message to UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Set loading state
    setIsLoading(true);

    try {
      // Call OpenAI API
      const response = await chatService.sendMessage(
        userMessage,
        projectId,
        projectTitle,
      );

      // Add AI response to messages
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response,
        },
      ]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I encountered an error while processing your request. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (isMinimized) setIsMinimized(false);
    if (!isOpen) setPosition({ x: 0, y: 0 }); // Reset position when opening
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 left-[calc(50%-600px)] z-50 rounded-full w-16 h-16 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
      >
        <div className="relative">
          <Bot className="h-7 w-7 text-white" />
          <span className="absolute -top-1 -right-1 bg-white text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
            ?
          </span>
        </div>
      </Button>
    );
  }

  return (
    <Card
      ref={cardRef}
      className={cn(
        "fixed z-50 shadow-xl transition-all duration-300",
        isMinimized ? "w-72 h-14" : "w-[450px] h-[600px] max-h-[80vh]",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{
        left: position.x || "calc(50% - 600px)",
        top: position.y || "auto",
        bottom: position.y ? "auto" : "24px",
        userSelect: isDragging ? "none" : "auto",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-t-lg drag-handle cursor-grab">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-white/70" />
          <div className="relative">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-white text-blue-600 rounded-full w-3 h-3 flex items-center justify-center text-[8px] font-bold">
              ?
            </span>
          </div>
          <h3 className="font-medium">Project Pilot</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-blue-700 rounded-full"
            onClick={toggleMinimize}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-blue-700 rounded-full"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div
            className="flex-1 overflow-auto"
            style={{ height: "calc(600px - 120px)" }}
          >
            <div className="p-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="mb-2">👋 Hi, I'm Project Pilot!</p>
                  <p>
                    I can help you with project management for{" "}
                    <span className="font-medium">{projectTitle}</span>. Ask me
                    anything!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3 max-w-[80%]">
                        <div className="h-3 w-3 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="h-3 w-3 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                        <div className="h-3 w-3 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Project Pilot..."
                className="min-h-[40px] max-h-[120px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                onClick={handleSendMessage}
                disabled={isLoading || !message.trim()}
                className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default ProjectPilot;
